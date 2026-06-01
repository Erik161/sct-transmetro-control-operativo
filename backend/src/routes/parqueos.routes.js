const router = require('express').Router();
const { query } = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');
const { auth, requireRoles } = require('../middleware/auth');

router.get('/', auth, requireRoles('Administrador', 'Supervisor'), asyncHandler(async (req, res) => {
  const result = await query(`
    SELECT p.*, b.id_bus, b.placa, b.num_unidad
    FROM parqueo p
    LEFT JOIN bus b ON b.id_parqueo = p.id_parqueo
    ORDER BY p.ubicacion
  `);
  res.json(result.rows);
}));

router.post('/', auth, requireRoles('Administrador'), asyncHandler(async (req, res) => {
  const result = await query('INSERT INTO parqueo (ubicacion) VALUES ($1) RETURNING *', [req.body.ubicacion]);
  res.status(201).json(result.rows[0]);
}));

module.exports = router;
