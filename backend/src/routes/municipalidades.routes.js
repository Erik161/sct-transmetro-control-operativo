const router = require('express').Router();
const { query } = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');
const { auth, requireRoles } = require('../middleware/auth');

router.get('/', auth, requireRoles('Administrador', 'Supervisor'), asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM municipalidad ORDER BY nombre');
  res.json(result.rows);
}));

router.post('/', auth, requireRoles('Administrador'), asyncHandler(async (req, res) => {
  const { nombre } = req.body;
  const result = await query(
    'INSERT INTO municipalidad (nombre) VALUES ($1) RETURNING *',
    [nombre]
  );
  res.status(201).json(result.rows[0]);
}));

router.get('/:id', auth, requireRoles('Administrador', 'Supervisor'), asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM municipalidad WHERE id_municipalidad = $1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Municipalidad no encontrada.' });
  res.json(result.rows[0]);
}));

router.put('/:id', auth, requireRoles('Administrador'), asyncHandler(async (req, res) => {
  const result = await query(
    'UPDATE municipalidad SET nombre = $1 WHERE id_municipalidad = $2 RETURNING *',
    [req.body.nombre, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Municipalidad no encontrada.' });
  res.json(result.rows[0]);
}));

router.delete('/:id', auth, requireRoles('Administrador'), asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM municipalidad WHERE id_municipalidad = $1 RETURNING *', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Municipalidad no encontrada.' });
  res.json({ mensaje: 'Municipalidad eliminada.' });
}));

module.exports = router;
