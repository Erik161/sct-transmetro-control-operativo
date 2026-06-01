const router = require('express').Router();
const { query } = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');
const { auth, requireRoles } = require('../middleware/auth');
const { emitAlerta } = require('../realtime/socket');

router.post('/capacidad/evaluar', auth, requireRoles('Operador', 'Administrador'), asyncHandler(async (req, res) => {
  const { id_recorrido, id_estacion, pasajeros_espera, pasajeros_bus } = req.body;
  const pasajerosEspera = Number(pasajeros_espera);
  const pasajerosBus = Number(pasajeros_bus);

  if (!id_recorrido || !id_estacion || !Number.isInteger(pasajerosEspera) || pasajerosEspera < 0 || !Number.isInteger(pasajerosBus) || pasajerosBus < 0) {
    return res.status(400).json({ error: 'Seleccione el recorrido y la estacion, e ingrese cantidades validas de pasajeros.' });
  }

  const recorrido = await query(`
    SELECT r.*, b.capacidad_maxima
    FROM recorrido r
    INNER JOIN bus b ON b.id_bus = r.id_bus
    WHERE r.id_recorrido = $1
  `, [id_recorrido]);

  if (!recorrido.rows[0]) return res.status(404).json({ error: 'Recorrido no encontrado.' });

  const data = recorrido.rows[0];
  if (req.usuario.rol === 'Operador' && Number(data.id_operador) !== Number(req.usuario.id_empleado)) {
    return res.status(403).json({ error: 'No puede evaluar un recorrido asignado a otro operador.' });
  }
  if (pasajerosBus > Number(data.capacidad_maxima)) {
    return res.status(409).json({ error: 'La ocupacion ingresada supera la capacidad maxima del bus.' });
  }
  const estacionValida = await query(
    'SELECT 1 FROM linea_estacion WHERE id_linea = $1 AND id_estacion = $2',
    [data.id_linea, id_estacion]
  );
  if (!estacionValida.rows[0]) {
    return res.status(409).json({ error: 'La estacion seleccionada no pertenece a la linea de este recorrido.' });
  }

  const alertas = [];
  const limiteSobredemanda = Number(data.capacidad_maxima) * 0.5;
  const limiteBajaOcupacion = Number(data.capacidad_maxima) * 0.25;

  if (pasajerosEspera > limiteSobredemanda) {
    const alerta = await query(`
      INSERT INTO alerta (tipo, id_recorrido, id_estacion, id_operador, descripcion)
      VALUES ('sobredemanda', $1, $2, $3, $4)
      RETURNING *
    `, [
      id_recorrido,
      id_estacion,
      req.usuario.id_empleado,
      `Pasajeros en espera (${pasajerosEspera}) superan el 50% de capacidad del bus (${data.capacidad_maxima}).`
    ]);
    alertas.push(alerta.rows[0]);
    emitAlerta(req, { ...alerta.rows[0], id_linea: data.id_linea });
  }

  if (pasajerosBus < limiteBajaOcupacion) {
    const alerta = await query(`
      INSERT INTO alerta (tipo, id_recorrido, id_estacion, id_operador, descripcion)
      VALUES ('baja_ocupacion', $1, $2, $3, $4)
      RETURNING *
    `, [
      id_recorrido,
      id_estacion,
      req.usuario.id_empleado,
      `Ocupacion del bus (${pasajerosBus}) no alcanza el 25% de capacidad (${data.capacidad_maxima}). Indicar espera de 5 minutos.`
    ]);
    alertas.push(alerta.rows[0]);
    emitAlerta(req, { ...alerta.rows[0], id_linea: data.id_linea });
  }

  res.json({
    capacidad_bus: data.capacidad_maxima,
    regla_sobredemanda_50: limiteSobredemanda,
    regla_baja_ocupacion_25: limiteBajaOcupacion,
    espera_adicional_minutos: pasajerosBus < limiteBajaOcupacion ? 5 : 0,
    alertas
  });
}));

module.exports = router;
