const router = require('express').Router();
const { query } = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');
const { auth, requireRoles } = require('../middleware/auth');

router.get('/', auth, requireRoles('Administrador', 'Supervisor'), asyncHandler(async (req, res) => {
  const result = await query(`
    SELECT e.*, m.nombre AS municipalidad
    FROM estacion e
    INNER JOIN municipalidad m ON m.id_municipalidad = e.id_municipalidad
    ORDER BY e.nombre
  `);
  res.json(result.rows);
}));

router.post('/', auth, requireRoles('Administrador'), asyncHandler(async (req, res) => {
  const { nombre, ubicacion, id_municipalidad } = req.body;
  const result = await query(`
    INSERT INTO estacion (nombre, ubicacion, id_municipalidad)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [nombre, ubicacion, id_municipalidad]);
  res.status(201).json(result.rows[0]);
}));

router.put('/:id', auth, requireRoles('Administrador'), asyncHandler(async (req, res) => {
  const { nombre, ubicacion, id_municipalidad } = req.body;
  const result = await query(`
    UPDATE estacion
    SET nombre = $1, ubicacion = $2, id_municipalidad = $3
    WHERE id_estacion = $4
    RETURNING *
  `, [nombre, ubicacion, id_municipalidad, req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Estacion no encontrada.' });
  res.json(result.rows[0]);
}));

router.delete('/:id', auth, requireRoles('Administrador'), asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM estacion WHERE id_estacion = $1 RETURNING *', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Estacion no encontrada.' });
  res.json({ mensaje: 'Estacion eliminada.' });
}));

router.get('/:id/accesos', auth, requireRoles('Administrador', 'Supervisor'), asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM acceso WHERE id_estacion = $1 ORDER BY tipo, id_acceso', [req.params.id]);
  res.json(result.rows);
}));

router.post('/:id/accesos', auth, requireRoles('Administrador'), asyncHandler(async (req, res) => {
  const { tipo } = req.body;
  const result = await query(
    'INSERT INTO acceso (tipo, id_estacion) VALUES ($1, $2) RETURNING *',
    [tipo, req.params.id]
  );
  res.status(201).json(result.rows[0]);
}));

module.exports = router;
