const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db/pool');
const env = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');
const { auth } = require('../middleware/auth');

router.post('/login', asyncHandler(async (req, res) => {
  const { correo, password } = req.body;
  if (!correo || !password) {
    return res.status(400).json({ error: 'Correo y contrasena son obligatorios.' });
  }
  const correoAcceso = correo === 'guardia@sct-transmetro.gt'
    ? 'piloto@sct-transmetro.gt'
    : correo;

  const result = await query(`
    SELECT u.id_usuario, u.contrasena, u.rol, e.id_empleado, e.nombre, e.correo, e.cargo
    FROM usuario u
    INNER JOIN empleado e ON e.id_empleado = u.id_empleado
    WHERE e.correo = $1
  `, [correoAcceso]);

  const usuario = result.rows[0];
  if (!usuario) return res.status(401).json({ error: 'Credenciales incorrectas.' });

  const valido = await bcrypt.compare(password, usuario.contrasena);
  if (!valido) return res.status(401).json({ error: 'Credenciales incorrectas.' });

  const token = jwt.sign({
    id_usuario: usuario.id_usuario,
    id_empleado: usuario.id_empleado,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol
  }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

  res.json({
    token,
    usuario: {
      id_usuario: usuario.id_usuario,
      id_empleado: usuario.id_empleado,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      cargo: usuario.cargo
    }
  });
}));

router.get('/me', auth, asyncHandler(async (req, res) => {
  res.json({ usuario: req.usuario });
}));

module.exports = router;
