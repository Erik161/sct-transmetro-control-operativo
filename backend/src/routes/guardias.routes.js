const router = require('express').Router();
const { query } = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');
const { auth, requireRoles } = require('../middleware/auth');

router.get('/', auth, requireRoles('Administrador', 'Supervisor'), asyncHandler(async (req, res) => {
  const result = await query("SELECT * FROM empleado WHERE cargo = 'Guardia' ORDER BY nombre");
  res.json(result.rows);
}));

router.get('/cobertura', auth, requireRoles('Administrador', 'Supervisor'), asyncHandler(async (req, res) => {
  const result = await query(`
    SELECT
      a.id_acceso,
      a.tipo,
      es.nombre AS estacion,
      es.ubicacion,
      COUNT(ag.id_empleado)::INT AS guardias_asignados,
      COALESCE(STRING_AGG(e.nombre, ', ' ORDER BY e.nombre), 'Sin guardia asignado') AS guardias
    FROM acceso a
    INNER JOIN estacion es ON es.id_estacion = a.id_estacion
    LEFT JOIN asignacion_guardia ag ON ag.id_acceso = a.id_acceso
    LEFT JOIN empleado e ON e.id_empleado = ag.id_empleado
    GROUP BY a.id_acceso, a.tipo, es.nombre, es.ubicacion
    ORDER BY es.nombre, a.tipo
  `);
  res.json(result.rows);
}));

router.post('/', auth, requireRoles('Administrador'), asyncHandler(async (req, res) => {
  const { nombre, dpi, formacion_academica, direccion, telefono, correo } = req.body;
  const result = await query(`
    INSERT INTO empleado (nombre, dpi, formacion_academica, direccion, telefono, correo, cargo)
    VALUES ($1, $2, $3, $4, $5, $6, 'Guardia')
    RETURNING *
  `, [nombre, dpi, formacion_academica || null, direccion, telefono, correo]);
  res.status(201).json(result.rows[0]);
}));

router.put('/:id', auth, requireRoles('Administrador'), asyncHandler(async (req, res) => {
  const { nombre, dpi, formacion_academica, direccion, telefono, correo } = req.body;
  const result = await query(`
    UPDATE empleado
    SET nombre = $1, dpi = $2, formacion_academica = $3, direccion = $4, telefono = $5, correo = $6, cargo = 'Guardia'
    WHERE id_empleado = $7 AND cargo = 'Guardia'
    RETURNING *
  `, [nombre, dpi, formacion_academica || null, direccion, telefono, correo, req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Guardia no encontrado.' });
  res.json(result.rows[0]);
}));

router.delete('/:id', auth, requireRoles('Administrador'), asyncHandler(async (req, res) => {
  const result = await query("DELETE FROM empleado WHERE id_empleado = $1 AND cargo = 'Guardia' RETURNING *", [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Guardia no encontrado.' });
  res.json({ mensaje: 'Guardia eliminado.' });
}));

router.post('/asignaciones', auth, requireRoles('Administrador'), asyncHandler(async (req, res) => {
  const { id_empleado, id_acceso, fecha_asignacion } = req.body;
  const empleado = await query('SELECT cargo FROM empleado WHERE id_empleado = $1', [id_empleado]);
  if (!empleado.rows[0] || empleado.rows[0].cargo !== 'Guardia') {
    return res.status(409).json({ error: 'El empleado asignado debe tener cargo Guardia.' });
  }

  const result = await query(`
    INSERT INTO asignacion_guardia (id_empleado, id_acceso, fecha_asignacion)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [id_empleado, id_acceso, fecha_asignacion || new Date()]);
  res.status(201).json(result.rows[0]);
}));

module.exports = router;
