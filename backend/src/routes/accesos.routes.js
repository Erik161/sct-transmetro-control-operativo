const router = require('express').Router();
const { query } = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');
const { auth, requireRoles } = require('../middleware/auth');

router.get('/', auth, requireRoles('Administrador', 'Supervisor'), asyncHandler(async (req, res) => {
  const result = await query(`
    SELECT a.*, e.nombre AS estacion
    FROM acceso a
    INNER JOIN estacion e ON e.id_estacion = a.id_estacion
    ORDER BY e.nombre, a.tipo
  `);
  res.json(result.rows);
}));

router.get('/:id/guardias', auth, requireRoles('Administrador', 'Supervisor'), asyncHandler(async (req, res) => {
  const result = await query(`
    SELECT ag.*, e.nombre, e.dpi, e.telefono, e.correo
    FROM asignacion_guardia ag
    INNER JOIN empleado e ON e.id_empleado = ag.id_empleado
    WHERE ag.id_acceso = $1
    ORDER BY ag.fecha_asignacion DESC
  `, [req.params.id]);
  res.json(result.rows);
}));

module.exports = router;
