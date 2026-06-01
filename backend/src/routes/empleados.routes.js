const router = require('express').Router();
const { query } = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');
const { auth, requireRoles } = require('../middleware/auth');

router.get('/', auth, requireRoles('Administrador', 'Supervisor'), asyncHandler(async (req, res) => {
  const params = [];
  let sql = `
    SELECT
      e.*,
      COALESCE(
        STRING_AGG(DISTINCT es.nombre || ' (' || a.tipo || ')', ', ' ORDER BY es.nombre || ' (' || a.tipo || ')'),
        ''
      ) AS asignaciones_guardia
    FROM empleado e
    LEFT JOIN asignacion_guardia ag ON ag.id_empleado = e.id_empleado
    LEFT JOIN acceso a ON a.id_acceso = ag.id_acceso
    LEFT JOIN estacion es ON es.id_estacion = a.id_estacion
  `;
  if (req.query.cargo) {
    params.push(req.query.cargo);
    sql += ' WHERE e.cargo = $1';
  }
  sql += ' GROUP BY e.id_empleado ORDER BY e.nombre';
  const result = await query(sql, params);
  res.json(result.rows);
}));

router.post('/', auth, requireRoles('Administrador'), asyncHandler(async (req, res) => {
  const {
    nombre,
    dpi,
    formacion_academica,
    direccion,
    telefono,
    correo,
    cargo
  } = req.body;

  const result = await query(`
    INSERT INTO empleado (nombre, dpi, formacion_academica, direccion, telefono, correo, cargo)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [nombre, dpi, formacion_academica || null, direccion, telefono, correo, cargo]);

  res.status(201).json(result.rows[0]);
}));

router.get('/:id', auth, requireRoles('Administrador', 'Supervisor'), asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM empleado WHERE id_empleado = $1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Empleado no encontrado.' });
  res.json(result.rows[0]);
}));

router.put('/:id', auth, requireRoles('Administrador'), asyncHandler(async (req, res) => {
  const {
    nombre,
    dpi,
    formacion_academica,
    direccion,
    telefono,
    correo,
    cargo
  } = req.body;

  const result = await query(`
    UPDATE empleado
    SET nombre = $1, dpi = $2, formacion_academica = $3, direccion = $4, telefono = $5, correo = $6, cargo = $7
    WHERE id_empleado = $8
    RETURNING *
  `, [nombre, dpi, formacion_academica || null, direccion, telefono, correo, cargo, req.params.id]);

  if (!result.rows[0]) return res.status(404).json({ error: 'Empleado no encontrado.' });
  res.json(result.rows[0]);
}));

router.delete('/:id', auth, requireRoles('Administrador'), asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM empleado WHERE id_empleado = $1 RETURNING *', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Empleado no encontrado.' });
  res.json({ mensaje: 'Empleado eliminado.' });
}));

module.exports = router;
