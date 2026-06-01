const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { query } = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');
const { auth, requireRoles } = require('../middleware/auth');

router.get('/', auth, requireRoles('Administrador'), asyncHandler(async (req, res) => {
  const result = await query(`
    SELECT u.id_usuario, u.id_empleado, u.rol, e.nombre, e.correo, e.cargo
    FROM usuario u
    INNER JOIN empleado e ON e.id_empleado = u.id_empleado
    ORDER BY e.nombre
  `);
  res.json(result.rows);
}));

router.post('/', auth, requireRoles('Administrador'), asyncHandler(async (req, res) => {
  const { id_empleado, password, rol } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const result = await query(
    'INSERT INTO usuario (id_empleado, contrasena, rol) VALUES ($1, $2, $3) RETURNING id_usuario, id_empleado, rol',
    [id_empleado, hash, rol]
  );
  res.status(201).json(result.rows[0]);
}));

module.exports = router;
