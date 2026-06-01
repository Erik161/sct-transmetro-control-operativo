const router = require('express').Router();
const { query } = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');
const { auth } = require('../middleware/auth');

async function getAlertasRecientes(idOperador) {
  const params = [];
  let filtro = '';
  if (idOperador) {
    params.push(idOperador);
    filtro = 'WHERE a.id_operador = $1';
  }

  const result = await query(`
    SELECT a.id_alerta, a.tipo, a.descripcion, a.fecha_hora, e.nombre AS estacion, l.nombre AS linea
    FROM alerta a
    INNER JOIN estacion e ON e.id_estacion = a.id_estacion
    INNER JOIN recorrido r ON r.id_recorrido = a.id_recorrido
    INNER JOIN linea l ON l.id_linea = r.id_linea
    ${filtro}
    ORDER BY a.fecha_hora DESC
    LIMIT 5
  `, params);
  return result.rows;
}

async function getResumenRed() {
  const [lineas, estaciones, buses, alertas, recorridosHoy, cobertura, estadoLineas] = await Promise.all([
    query('SELECT COUNT(*)::INT AS total FROM linea'),
    query('SELECT COUNT(*)::INT AS total FROM estacion'),
    query('SELECT COUNT(*)::INT AS total FROM bus'),
    query("SELECT tipo, COUNT(*)::INT AS total FROM alerta WHERE fecha_hora >= NOW() - INTERVAL '7 days' GROUP BY tipo ORDER BY tipo"),
    query('SELECT COUNT(*)::INT AS total FROM recorrido WHERE fecha::DATE = CURRENT_DATE'),
    query(`
      SELECT
        COUNT(*)::INT AS total_accesos,
        COUNT(*) FILTER (WHERE guardias_asignados = 0)::INT AS accesos_sin_cobertura
      FROM (
        SELECT a.id_acceso, COUNT(ag.id_empleado)::INT AS guardias_asignados
        FROM acceso a
        LEFT JOIN asignacion_guardia ag ON ag.id_acceso = a.id_acceso
        GROUP BY a.id_acceso
      ) AS accesos
    `),
    query(`
      SELECT l.id_linea, l.codigo, l.nombre,
        COUNT(DISTINCT le.id_estacion)::INT AS total_estaciones,
        COUNT(DISTINCT b.id_bus)::INT AS total_buses
      FROM linea l
      LEFT JOIN linea_estacion le ON le.id_linea = l.id_linea
      LEFT JOIN bus b ON b.id_linea = l.id_linea
      GROUP BY l.id_linea
      ORDER BY l.codigo
    `)
  ]);

  return {
    lineas: lineas.rows[0].total,
    estaciones: estaciones.rows[0].total,
    buses: buses.rows[0].total,
    recorridos_hoy: recorridosHoy.rows[0].total,
    total_accesos: cobertura.rows[0].total_accesos,
    accesos_sin_cobertura: cobertura.rows[0].accesos_sin_cobertura,
    alertas_ultimos_7_dias: alertas.rows,
    alertas_recientes: await getAlertasRecientes(),
    estado_lineas: estadoLineas.rows.map((linea) => ({
      ...linea,
      cumple_asignacion_buses: linea.total_estaciones > 0
        && linea.total_buses >= linea.total_estaciones
        && linea.total_buses <= linea.total_estaciones * 2
    }))
  };
}

router.get('/', auth, asyncHandler(async (req, res) => {
  const { rol, id_empleado } = req.usuario;

  if (rol === 'Piloto') {
    const bus = await query(`
      SELECT b.id_bus, b.num_unidad, b.placa, b.capacidad_maxima, p.ubicacion AS parqueo,
        l.id_linea, l.codigo AS codigo_linea, l.nombre AS linea, l.distancia_total,
        STRING_AGG(DISTINCT h.descripcion, ' | ') AS horarios
      FROM bus b
      INNER JOIN parqueo p ON p.id_parqueo = b.id_parqueo
      LEFT JOIN linea l ON l.id_linea = b.id_linea
      LEFT JOIN horario_linea h ON h.id_linea = l.id_linea
      WHERE b.id_piloto = $1
      GROUP BY b.id_bus, p.ubicacion, l.id_linea
    `, [id_empleado]);
    const unidad = bus.rows[0] || null;
    const estaciones = unidad?.id_linea
      ? await query(`
          SELECT e.id_estacion, e.nombre, e.ubicacion, le.orden
          FROM linea_estacion le
          INNER JOIN estacion e ON e.id_estacion = le.id_estacion
          WHERE le.id_linea = $1
          ORDER BY le.orden
        `, [unidad.id_linea])
      : { rows: [] };
    return res.json({ rol, unidad, estaciones: estaciones.rows });
  }

  if (rol === 'Operador') {
    const [recorridosHoy, alertas] = await Promise.all([
      query('SELECT COUNT(*)::INT AS total FROM recorrido WHERE id_operador = $1 AND fecha::DATE = CURRENT_DATE', [id_empleado]),
      query("SELECT tipo, COUNT(*)::INT AS total FROM alerta WHERE id_operador = $1 AND fecha_hora >= NOW() - INTERVAL '7 days' GROUP BY tipo ORDER BY tipo", [id_empleado])
    ]);
    return res.json({
      rol,
      recorridos_hoy: recorridosHoy.rows[0].total,
      alertas_ultimos_7_dias: alertas.rows,
      alertas_recientes: await getAlertasRecientes(id_empleado)
    });
  }

  const resumen = await getResumenRed();
  if (rol === 'Supervisor') return res.json({ rol, ...resumen });

  const [municipalidades, empleados] = await Promise.all([
    query('SELECT COUNT(*)::INT AS total FROM municipalidad'),
    query('SELECT cargo, COUNT(*)::INT AS total FROM empleado GROUP BY cargo ORDER BY cargo')
  ]);
  return res.json({
    rol,
    ...resumen,
    municipalidades: municipalidades.rows[0].total,
    empleados_por_cargo: empleados.rows
  });
}));

module.exports = router;
