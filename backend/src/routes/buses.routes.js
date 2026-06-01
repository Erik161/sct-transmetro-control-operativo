const router = require('express').Router();
const { query } = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');
const { auth, requireRoles } = require('../middleware/auth');

async function validarPiloto(idPiloto, res) {
  if (!idPiloto) return true;
  const piloto = await query('SELECT cargo FROM empleado WHERE id_empleado = $1', [idPiloto]);
  if (!piloto.rows[0] || piloto.rows[0].cargo !== 'Piloto') {
    res.status(409).json({ error: 'El empleado asignado debe tener cargo Piloto.' });
    return false;
  }
  return true;
}

router.get('/', auth, requireRoles('Administrador', 'Supervisor', 'Operador'), asyncHandler(async (req, res) => {
  const params = [];
  let where = '';
  if (req.query.id_linea) {
    params.push(req.query.id_linea);
    where = 'WHERE b.id_linea = $1';
  }

  const result = await query(`
    SELECT b.*, l.nombre AS linea, p.ubicacion AS parqueo, e.nombre AS piloto
    FROM bus b
    LEFT JOIN linea l ON l.id_linea = b.id_linea
    INNER JOIN parqueo p ON p.id_parqueo = b.id_parqueo
    LEFT JOIN empleado e ON e.id_empleado = b.id_piloto
    ${where}
    ORDER BY b.num_unidad
  `, params);
  res.json(result.rows);
}));

router.post('/', auth, requireRoles('Administrador'), asyncHandler(async (req, res) => {
  const { placa, num_unidad, capacidad_maxima, id_linea, id_parqueo, id_piloto } = req.body;
  if (!id_parqueo) return res.status(400).json({ error: 'Todo bus debe tener parqueo obligatorio.' });
  if (!Number.isInteger(Number(num_unidad)) || Number(num_unidad) <= 0 || !Number.isInteger(Number(capacidad_maxima)) || Number(capacidad_maxima) <= 0) {
    return res.status(400).json({ error: 'Numero de unidad y capacidad deben ser valores positivos.' });
  }
  if (!await validarPiloto(id_piloto, res)) return;

  const result = await query(`
    INSERT INTO bus (placa, num_unidad, capacidad_maxima, id_linea, id_parqueo, id_piloto)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [placa, num_unidad, capacidad_maxima, id_linea || null, id_parqueo, id_piloto || null]);

  res.status(201).json(result.rows[0]);
}));

router.post('/:id/asignar-parqueo', auth, requireRoles('Administrador'), asyncHandler(async (req, res) => {
  const result = await query(
    'UPDATE bus SET id_parqueo = $1 WHERE id_bus = $2 RETURNING *',
    [req.body.id_parqueo, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Bus no encontrado.' });
  res.json(result.rows[0]);
}));

router.post('/:id/asignar-piloto', auth, requireRoles('Administrador'), asyncHandler(async (req, res) => {
  if (!await validarPiloto(req.body.id_piloto, res)) return;
  const result = await query(
    'UPDATE bus SET id_piloto = $1 WHERE id_bus = $2 RETURNING *',
    [req.body.id_piloto, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Bus no encontrado.' });
  res.json(result.rows[0]);
}));

router.put('/:id', auth, requireRoles('Administrador'), asyncHandler(async (req, res) => {
  const { placa, num_unidad, capacidad_maxima, id_linea, id_parqueo, id_piloto } = req.body;
  if (!id_parqueo) return res.status(400).json({ error: 'Todo bus debe tener parqueo obligatorio.' });
  if (!Number.isInteger(Number(num_unidad)) || Number(num_unidad) <= 0 || !Number.isInteger(Number(capacidad_maxima)) || Number(capacidad_maxima) <= 0) {
    return res.status(400).json({ error: 'Numero de unidad y capacidad deben ser valores positivos.' });
  }
  if (!await validarPiloto(id_piloto, res)) return;
  const result = await query(`
    UPDATE bus
    SET placa = $1, num_unidad = $2, capacidad_maxima = $3, id_linea = $4, id_parqueo = $5, id_piloto = $6
    WHERE id_bus = $7
    RETURNING *
  `, [placa, num_unidad, capacidad_maxima, id_linea || null, id_parqueo, id_piloto || null, req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Bus no encontrado.' });
  res.json(result.rows[0]);
}));

router.delete('/:id', auth, requireRoles('Administrador'), asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM bus WHERE id_bus = $1 RETURNING *', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Bus no encontrado.' });
  res.json({ mensaje: 'Bus eliminado.' });
}));

module.exports = router;
