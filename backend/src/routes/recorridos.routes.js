const router = require('express').Router();
const { query } = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');
const { auth, requireRoles } = require('../middleware/auth');

router.get('/', auth, requireRoles('Administrador', 'Supervisor', 'Operador'), asyncHandler(async (req, res) => {
  const params = [];
  let filtro = '';
  if (req.usuario.rol === 'Operador') {
    params.push(req.usuario.id_empleado);
    filtro = 'WHERE r.id_operador = $1';
  }
  const result = await query(`
    SELECT r.*, b.placa, b.num_unidad, b.capacidad_maxima, l.nombre AS linea, l.codigo AS codigo_linea, e.nombre AS operador
    FROM recorrido r
    INNER JOIN bus b ON b.id_bus = r.id_bus
    INNER JOIN linea l ON l.id_linea = r.id_linea
    INNER JOIN empleado e ON e.id_empleado = r.id_operador
    ${filtro}
    ORDER BY r.fecha DESC, r.id_recorrido DESC
  `, params);
  res.json(result.rows);
}));

router.post('/', auth, requireRoles('Operador', 'Administrador'), asyncHandler(async (req, res) => {
  const { id_bus, id_linea, fecha } = req.body;
  const bus = await query('SELECT id_linea FROM bus WHERE id_bus = $1', [id_bus]);
  if (!bus.rows[0]) return res.status(404).json({ error: 'Bus no encontrado.' });
  if (Number(bus.rows[0].id_linea) !== Number(id_linea)) {
    return res.status(409).json({ error: 'El bus seleccionado no pertenece a la linea indicada.' });
  }
  const result = await query(`
    INSERT INTO recorrido (id_bus, id_linea, id_operador, fecha)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [id_bus, id_linea, req.usuario.id_empleado, fecha || new Date()]);
  res.status(201).json(result.rows[0]);
}));

router.post('/:id/detalles', auth, requireRoles('Operador', 'Administrador'), asyncHandler(async (req, res) => {
  const { id_estacion, hora_llegada, hora_salida, pasajeros_subieron, pasajeros_bajaron } = req.body;
  const recorrido = await query('SELECT id_linea, id_operador FROM recorrido WHERE id_recorrido = $1', [req.params.id]);
  if (!recorrido.rows[0]) return res.status(404).json({ error: 'Recorrido no encontrado.' });
  if (req.usuario.rol === 'Operador' && Number(recorrido.rows[0].id_operador) !== Number(req.usuario.id_empleado)) {
    return res.status(403).json({ error: 'No puede modificar un recorrido asignado a otro operador.' });
  }
  const estacion = await query('SELECT 1 FROM linea_estacion WHERE id_linea = $1 AND id_estacion = $2', [recorrido.rows[0].id_linea, id_estacion]);
  if (!estacion.rows[0]) return res.status(409).json({ error: 'La estacion no pertenece a la linea del recorrido.' });
  const result = await query(`
    INSERT INTO detalle_recorrido
      (id_recorrido, id_estacion, hora_llegada, hora_salida, pasajeros_subieron, pasajeros_bajaron)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [req.params.id, id_estacion, hora_llegada, hora_salida || null, pasajeros_subieron || 0, pasajeros_bajaron || 0]);
  res.status(201).json(result.rows[0]);
}));

module.exports = router;
