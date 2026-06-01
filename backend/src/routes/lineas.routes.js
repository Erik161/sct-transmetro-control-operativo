const router = require('express').Router();
const { pool, query } = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');
const { auth, requireRoles } = require('../middleware/auth');

router.get('/', auth, requireRoles('Administrador', 'Supervisor', 'Operador'), asyncHandler(async (req, res) => {
  const result = await query(`
    SELECT l.*,
      COALESCE(COUNT(DISTINCT le.id_estacion), 0)::INT AS total_estaciones,
      COALESCE(COUNT(DISTINCT b.id_bus), 0)::INT AS total_buses,
      STRING_AGG(DISTINCT h.descripcion, ' | ') AS horarios
    FROM linea l
    LEFT JOIN linea_estacion le ON le.id_linea = l.id_linea
    LEFT JOIN bus b ON b.id_linea = l.id_linea
    LEFT JOIN horario_linea h ON h.id_linea = l.id_linea
    GROUP BY l.id_linea
    ORDER BY l.codigo
  `);
  res.json(result.rows);
}));

router.post('/', auth, requireRoles('Administrador'), asyncHandler(async (req, res) => {
  const { nombre, codigo, id_municipalidad, fuente_url } = req.body;
  const result = await query(`
    INSERT INTO linea (nombre, codigo, id_municipalidad, fuente_url)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [nombre, codigo, id_municipalidad, fuente_url || null]);
  res.status(201).json(result.rows[0]);
}));

router.put('/:id', auth, requireRoles('Administrador'), asyncHandler(async (req, res) => {
  const { nombre, codigo, id_municipalidad, fuente_url } = req.body;
  const result = await query(`
    UPDATE linea
    SET nombre = $1, codigo = $2, id_municipalidad = $3, fuente_url = $4
    WHERE id_linea = $5
    RETURNING *
  `, [nombre, codigo, id_municipalidad, fuente_url || null, req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Linea no encontrada.' });
  res.json(result.rows[0]);
}));

router.delete('/:id', auth, requireRoles('Administrador'), asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM linea WHERE id_linea = $1 RETURNING *', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Linea no encontrada.' });
  res.json({ mensaje: 'Linea eliminada.' });
}));

router.get('/:id', auth, requireRoles('Administrador', 'Supervisor', 'Operador'), asyncHandler(async (req, res) => {
  const linea = await query('SELECT * FROM linea WHERE id_linea = $1', [req.params.id]);
  if (!linea.rows[0]) return res.status(404).json({ error: 'Linea no encontrada.' });

  const estaciones = await query(`
    SELECT e.*, le.orden, le.distancia_anterior
    FROM linea_estacion le
    INNER JOIN estacion e ON e.id_estacion = le.id_estacion
    WHERE le.id_linea = $1
    ORDER BY le.orden
  `, [req.params.id]);

  const buses = await query(`
    SELECT b.*, e.nombre AS piloto, p.ubicacion AS parqueo
    FROM bus b
    LEFT JOIN empleado e ON e.id_empleado = b.id_piloto
    INNER JOIN parqueo p ON p.id_parqueo = b.id_parqueo
    WHERE b.id_linea = $1
    ORDER BY b.num_unidad
  `, [req.params.id]);
  const n = estaciones.rows.length;
  const total = buses.rows.length;

  res.json({
    ...linea.rows[0],
    estaciones: estaciones.rows,
    buses: buses.rows,
    regla_buses: { minimo: n, maximo: n * 2, asignados: total, cumple: n > 0 && total >= n && total <= n * 2 }
  });
}));

router.post('/:id/estaciones', auth, requireRoles('Administrador'), asyncHandler(async (req, res) => {
  const { estaciones } = req.body;
  if (!Array.isArray(estaciones) || estaciones.length === 0) {
    return res.status(400).json({ error: 'Debe enviar estaciones en orden.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM linea_estacion WHERE id_linea = $1', [req.params.id]);

    let distanciaTotal = 0;
    for (const item of estaciones) {
      distanciaTotal += Number(item.distancia_anterior || 0);
      await client.query(`
        INSERT INTO linea_estacion (id_linea, id_estacion, orden, distancia_anterior)
        VALUES ($1, $2, $3, $4)
      `, [req.params.id, item.id_estacion, item.orden, item.distancia_anterior || 0]);
    }

    await client.query('UPDATE linea SET distancia_total = $1 WHERE id_linea = $2', [distanciaTotal, req.params.id]);
    await client.query('COMMIT');
    res.status(201).json({ mensaje: 'Recorrido de linea actualizado.', distancia_total: distanciaTotal });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

router.post('/:id/buses', auth, requireRoles('Administrador'), asyncHandler(async (req, res) => {
  const { bus_ids } = req.body;
  if (!Array.isArray(bus_ids)) return res.status(400).json({ error: 'bus_ids debe ser un arreglo.' });

  const estaciones = await query('SELECT COUNT(*)::INT AS total FROM linea_estacion WHERE id_linea = $1', [req.params.id]);
  const n = estaciones.rows[0].total;
  if (n === 0) return res.status(409).json({ error: 'La linea debe tener estaciones antes de asignar buses.' });
  if (bus_ids.length < n || bus_ids.length > n * 2) {
    return res.status(409).json({ error: `La linea requiere entre ${n} y ${n * 2} buses.` });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE bus SET id_linea = NULL WHERE id_linea = $1', [req.params.id]);

    for (const idBus of bus_ids) {
      const actual = await client.query('SELECT id_linea FROM bus WHERE id_bus = $1 FOR UPDATE', [idBus]);
      if (!actual.rows[0]) throw new Error(`Bus ${idBus} no existe.`);
      if (actual.rows[0].id_linea && Number(actual.rows[0].id_linea) !== Number(req.params.id)) {
        throw new Error(`Bus ${idBus} ya esta asignado a otra linea.`);
      }
      await client.query('UPDATE bus SET id_linea = $1 WHERE id_bus = $2', [req.params.id, idBus]);
    }

    await client.query('COMMIT');
    res.json({ mensaje: 'Buses asignados a la linea.', total_buses: bus_ids.length, minimo: n, maximo: n * 2 });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(409).json({ error: error.message });
  } finally {
    client.release();
  }
}));

module.exports = router;
