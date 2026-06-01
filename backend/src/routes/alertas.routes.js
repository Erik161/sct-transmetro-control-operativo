const router = require('express').Router();
const { query } = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');
const { auth, requireRoles } = require('../middleware/auth');

router.get('/', auth, requireRoles('Administrador', 'Supervisor', 'Operador'), asyncHandler(async (req, res) => {
  const params = [];
  let filtro = '';
  if (req.usuario.rol === 'Operador') {
    params.push(req.usuario.id_empleado);
    filtro = 'WHERE a.id_operador = $1';
  }
  const result = await query(`
    SELECT a.*, e.nombre AS estacion, l.nombre AS linea
    FROM alerta a
    INNER JOIN estacion e ON e.id_estacion = a.id_estacion
    INNER JOIN recorrido r ON r.id_recorrido = a.id_recorrido
    INNER JOIN linea l ON l.id_linea = r.id_linea
    ${filtro}
    ORDER BY a.fecha_hora DESC
  `, params);
  res.json(result.rows);
}));

module.exports = router;
