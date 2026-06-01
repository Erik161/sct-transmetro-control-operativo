require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, query } = require('../src/db/pool');

async function limpiarDuplicadosDemo() {
  await query(`
    DELETE FROM acceso a
    USING estacion e
    WHERE a.id_estacion = e.id_estacion
      AND e.id_estacion NOT IN (
        SELECT MIN(id_estacion) FROM estacion GROUP BY nombre
      )
  `);

  await query(`
    UPDATE linea
    SET id_municipalidad = base.id_municipalidad
    FROM (
      SELECT MIN(id_municipalidad) AS id_municipalidad, nombre
      FROM municipalidad
      GROUP BY nombre
    ) base
    INNER JOIN municipalidad actual ON actual.nombre = base.nombre
    WHERE linea.id_municipalidad = actual.id_municipalidad
  `);

  await query(`
    UPDATE estacion
    SET id_municipalidad = base.id_municipalidad
    FROM (
      SELECT MIN(id_municipalidad) AS id_municipalidad, nombre
      FROM municipalidad
      GROUP BY nombre
    ) base
    INNER JOIN municipalidad actual ON actual.nombre = base.nombre
    WHERE estacion.id_municipalidad = actual.id_municipalidad
  `);

  await query(`
    DELETE FROM linea_estacion le
    USING estacion e
    WHERE le.id_estacion = e.id_estacion
      AND e.id_estacion NOT IN (
        SELECT MIN(id_estacion) FROM estacion GROUP BY nombre
      )
  `);

  await query(`
    DELETE FROM estacion e
    WHERE e.id_estacion NOT IN (
      SELECT MIN(id_estacion) FROM estacion GROUP BY nombre
    )
  `);

  await query(`
    DELETE FROM parqueo p
    WHERE p.id_parqueo NOT IN (
      SELECT MIN(id_parqueo) FROM parqueo GROUP BY ubicacion
    )
    AND NOT EXISTS (
      SELECT 1 FROM bus b WHERE b.id_parqueo = p.id_parqueo
    )
  `);

  await query(`
    DELETE FROM municipalidad m
    WHERE m.id_municipalidad NOT IN (
      SELECT MIN(id_municipalidad) FROM municipalidad GROUP BY nombre
    )
  `);
}

async function seed() {
  await limpiarDuplicadosDemo();

  const passwordAdmin = await bcrypt.hash('admin123', 10);
  const passwordOperador = await bcrypt.hash('operador123', 10);
  const passwordSupervisor = await bcrypt.hash('supervisor123', 10);
  const passwordPiloto = await bcrypt.hash('guardia123', 10);

  await query("DELETE FROM usuario WHERE rol = 'Guardia'");
  await query('ALTER TABLE usuario DROP CONSTRAINT IF EXISTS usuario_rol_check');
  await query(`
    ALTER TABLE usuario
    ADD CONSTRAINT usuario_rol_check
    CHECK (rol IN ('Piloto', 'Operador', 'Supervisor', 'Administrador'))
  `);

  await query(`
    INSERT INTO municipalidad (nombre)
    SELECT 'Municipalidad de Guatemala'
    WHERE NOT EXISTS (SELECT 1 FROM municipalidad WHERE nombre = 'Municipalidad de Guatemala')
  `);

  await query(`
    INSERT INTO parqueo (ubicacion)
    SELECT ubicacion
    FROM (VALUES
      ('Patio Central Zona 1'),
      ('Patio CENMA'),
      ('Patio Norte')
    ) AS v(ubicacion)
    WHERE NOT EXISTS (SELECT 1 FROM parqueo p WHERE p.ubicacion = v.ubicacion)
  `);

  await query(`
    INSERT INTO empleado (nombre, dpi, formacion_academica, direccion, telefono, correo, cargo) VALUES
      ('Andrea Morales Castillo', '0000000000001', 'Licenciatura en administracion', 'Zona 1, Ciudad de Guatemala', '55510001', 'admin@sct-transmetro.gt', 'Administrador'),
      ('Luis Fernando Lopez', '0000000000002', 'Bachillerato en computacion', 'Zona 12, Ciudad de Guatemala', '55510002', 'operador@sct-transmetro.gt', 'Operador'),
      ('Mariana Isabel Reyes', '0000000000003', 'Ingenieria industrial', 'Zona 10, Ciudad de Guatemala', '55510003', 'supervisor@sct-transmetro.gt', 'Supervisor'),
      ('Carlos Enrique Tzul', '0000000000004', 'Diversificado', 'Zona 6, Ciudad de Guatemala', '55510004', 'guardia@sct-transmetro.gt', 'Guardia'),
      ('Jorge Armando Perez', '0000000000005', 'Diversificado', 'Zona 18, Ciudad de Guatemala', '55510005', 'piloto@sct-transmetro.gt', 'Piloto'),
      ('Rosa Maria Garcia', '0000000000006', 'Diversificado', 'Zona 7, Ciudad de Guatemala', '55510006', 'piloto2@sct-transmetro.gt', 'Piloto'),
      ('Mario Roberto Cifuentes', '0000000000019', 'Diversificado', 'Zona 6, Ciudad de Guatemala', '55510019', 'piloto3@sct-transmetro.gt', 'Piloto'),
      ('Silvia Carolina Mejia', '0000000000020', 'Diversificado', 'Zona 12, Ciudad de Guatemala', '55510020', 'piloto4@sct-transmetro.gt', 'Piloto'),
      ('Edwin Alejandro Barrios', '0000000000021', 'Diversificado', 'Zona 1, Ciudad de Guatemala', '55510021', 'piloto5@sct-transmetro.gt', 'Piloto'),
      ('Marta Leticia Ramirez', '0000000000022', 'Diversificado', 'Zona 18, Ciudad de Guatemala', '55510022', 'piloto6@sct-transmetro.gt', 'Piloto'),
      ('Miguel Angel Choc', '0000000000007', 'Diversificado', 'Zona 5, Ciudad de Guatemala', '55510007', 'guardia2@sct-transmetro.gt', 'Guardia'),
      ('Patricia Hernandez Solis', '0000000000008', 'Diversificado', 'Zona 13, Ciudad de Guatemala', '55510008', 'operador2@sct-transmetro.gt', 'Operador'),
      ('Oscar Daniel Ruiz', '0000000000009', 'Diversificado', 'Zona 1, Ciudad de Guatemala', '55510009', 'guardia3@sct-transmetro.gt', 'Guardia'),
      ('Karla Beatriz Mendez', '0000000000010', 'Diversificado', 'Zona 2, Ciudad de Guatemala', '55510010', 'guardia4@sct-transmetro.gt', 'Guardia'),
      ('Hector David Lopez', '0000000000011', 'Diversificado', 'Zona 6, Ciudad de Guatemala', '55510011', 'guardia5@sct-transmetro.gt', 'Guardia'),
      ('Norma Judith Perez', '0000000000012', 'Diversificado', 'Zona 7, Ciudad de Guatemala', '55510012', 'guardia6@sct-transmetro.gt', 'Guardia'),
      ('Byron Estuardo Mejia', '0000000000013', 'Diversificado', 'Zona 8, Ciudad de Guatemala', '55510013', 'guardia7@sct-transmetro.gt', 'Guardia'),
      ('Claudia Maribel Santos', '0000000000014', 'Diversificado', 'Zona 9, Ciudad de Guatemala', '55510014', 'guardia8@sct-transmetro.gt', 'Guardia'),
      ('Fredy Alejandro Ramos', '0000000000015', 'Diversificado', 'Zona 11, Ciudad de Guatemala', '55510015', 'guardia9@sct-transmetro.gt', 'Guardia'),
      ('Ingrid Carolina Flores', '0000000000016', 'Diversificado', 'Zona 12, Ciudad de Guatemala', '55510016', 'guardia10@sct-transmetro.gt', 'Guardia'),
      ('Julio Cesar Vasquez', '0000000000017', 'Diversificado', 'Zona 13, Ciudad de Guatemala', '55510017', 'guardia11@sct-transmetro.gt', 'Guardia'),
      ('Wendy Gabriela Garcia', '0000000000018', 'Diversificado', 'Zona 18, Ciudad de Guatemala', '55510018', 'guardia12@sct-transmetro.gt', 'Guardia')
    ON CONFLICT (dpi) DO NOTHING
  `);

  await query(`
    UPDATE empleado e
    SET nombre = v.nombre,
        formacion_academica = v.formacion_academica,
        direccion = v.direccion,
        telefono = v.telefono,
        correo = v.correo,
        cargo = v.cargo
    FROM (VALUES
      ('0000000000001', 'Andrea Morales Castillo', 'Licenciatura en administracion', 'Zona 1, Ciudad de Guatemala', '55510001', 'admin@sct-transmetro.gt', 'Administrador'),
      ('0000000000002', 'Luis Fernando Lopez', 'Bachillerato en computacion', 'Zona 12, Ciudad de Guatemala', '55510002', 'operador@sct-transmetro.gt', 'Operador'),
      ('0000000000003', 'Mariana Isabel Reyes', 'Ingenieria industrial', 'Zona 10, Ciudad de Guatemala', '55510003', 'supervisor@sct-transmetro.gt', 'Supervisor'),
      ('0000000000004', 'Carlos Enrique Tzul', 'Diversificado', 'Zona 6, Ciudad de Guatemala', '55510004', 'guardia@sct-transmetro.gt', 'Guardia'),
      ('0000000000005', 'Jorge Armando Perez', 'Diversificado', 'Zona 18, Ciudad de Guatemala', '55510005', 'piloto@sct-transmetro.gt', 'Piloto')
    ) AS v(dpi, nombre, formacion_academica, direccion, telefono, correo, cargo)
    WHERE e.dpi = v.dpi
  `);

  await query(`
    INSERT INTO usuario (id_empleado, contrasena, rol)
    SELECT id_empleado, $1, 'Administrador' FROM empleado WHERE correo = 'admin@sct-transmetro.gt'
    ON CONFLICT (id_empleado) DO NOTHING
  `, [passwordAdmin]);

  await query(`
    INSERT INTO usuario (id_empleado, contrasena, rol)
    SELECT id_empleado, $1, 'Operador' FROM empleado WHERE correo = 'operador@sct-transmetro.gt'
    ON CONFLICT (id_empleado) DO NOTHING
  `, [passwordOperador]);

  await query(`
    INSERT INTO usuario (id_empleado, contrasena, rol)
    SELECT id_empleado, $1, 'Supervisor' FROM empleado WHERE correo = 'supervisor@sct-transmetro.gt'
    ON CONFLICT (id_empleado) DO NOTHING
  `, [passwordSupervisor]);

  await query(`
    INSERT INTO usuario (id_empleado, contrasena, rol)
    SELECT id_empleado, $1, 'Piloto' FROM empleado WHERE correo = 'piloto@sct-transmetro.gt'
    ON CONFLICT (id_empleado) DO UPDATE
    SET contrasena = EXCLUDED.contrasena, rol = EXCLUDED.rol
  `, [passwordPiloto]);

  await query(`
    INSERT INTO linea (nombre, codigo, id_municipalidad)
    SELECT 'Linea 1 - Eje Central', 'L1', id_municipalidad FROM municipalidad WHERE nombre = 'Municipalidad de Guatemala'
    ON CONFLICT (codigo) DO NOTHING
  `);

  await query(`
    INSERT INTO estacion (nombre, ubicacion, id_municipalidad)
    SELECT v.nombre, v.ubicacion, m.id_municipalidad
    FROM (VALUES
      ('CENMA', 'Zona 12'),
      ('Trébol', 'Zona 11'),
      ('Centro Cívico', 'Zona 1')
    ) AS v(nombre, ubicacion)
    CROSS JOIN municipalidad m
    WHERE m.nombre = 'Municipalidad de Guatemala'
      AND NOT EXISTS (SELECT 1 FROM estacion e WHERE e.nombre = v.nombre)
  `);

  await query(`
    INSERT INTO acceso (tipo, id_estacion)
    SELECT v.tipo, e.id_estacion
    FROM (VALUES
      ('CENMA', 'entrada'),
      ('CENMA', 'salida'),
      ('Trébol', 'entrada'),
      ('Trébol', 'salida'),
      ('Centro Cívico', 'entrada'),
      ('Centro Cívico', 'salida')
    ) AS v(estacion, tipo)
    INNER JOIN estacion e ON e.nombre = v.estacion
    WHERE NOT EXISTS (
      SELECT 1 FROM acceso a WHERE a.id_estacion = e.id_estacion AND a.tipo = v.tipo
    )
  `);

  await query(`
    INSERT INTO linea_estacion (id_linea, id_estacion, orden, distancia_anterior)
    SELECT l.id_linea, e.id_estacion, v.orden, v.distancia_anterior
    FROM (VALUES
      ('CENMA', 1, 0.00),
      ('Trébol', 2, 4.20),
      ('Centro Cívico', 3, 3.10)
    ) AS v(estacion, orden, distancia_anterior)
    INNER JOIN linea l ON l.codigo = 'L1'
    INNER JOIN estacion e ON e.nombre = v.estacion
    WHERE NOT EXISTS (
      SELECT 1 FROM linea_estacion le WHERE le.id_linea = l.id_linea AND le.id_estacion = e.id_estacion
    )
    ON CONFLICT DO NOTHING
  `);

  await query(`
    UPDATE linea
    SET distancia_total = (
      SELECT COALESCE(SUM(distancia_anterior), 0)
      FROM linea_estacion
      WHERE id_linea = linea.id_linea
    )
    WHERE codigo = 'L1'
  `);

  await query(`
    INSERT INTO asignacion_guardia (id_empleado, id_acceso, fecha_asignacion)
    SELECT g.id_empleado, a.id_acceso, CURRENT_DATE
    FROM empleado g
    CROSS JOIN LATERAL (
      SELECT id_acceso FROM acceso ORDER BY id_acceso LIMIT 1
    ) a
    WHERE g.correo = 'guardia@sct-transmetro.gt'
      AND NOT EXISTS (
        SELECT 1 FROM asignacion_guardia ag
        WHERE ag.id_empleado = g.id_empleado AND ag.id_acceso = a.id_acceso
      )
  `);

  await query('DELETE FROM asignacion_guardia');

  await query(`
    INSERT INTO asignacion_guardia (id_empleado, id_acceso, fecha_asignacion)
    SELECT guardias.id_empleado, accesos.id_acceso, CURRENT_DATE
    FROM (
      SELECT id_acceso, ROW_NUMBER() OVER (ORDER BY id_acceso) AS rn
      FROM acceso
    ) accesos
    INNER JOIN (
      SELECT id_empleado, ROW_NUMBER() OVER (ORDER BY id_empleado) AS rn, COUNT(*) OVER () AS total
      FROM empleado
      WHERE cargo = 'Guardia'
    ) guardias ON ((accesos.rn - 1) % guardias.total) + 1 = guardias.rn
  `);

  await query(`
    INSERT INTO bus (placa, num_unidad, capacidad_maxima, id_linea, id_parqueo, id_piloto)
    SELECT v.placa, v.num_unidad, v.capacidad_maxima, l.id_linea, p.id_parqueo, piloto.id_empleado
    FROM (VALUES
      ('P001GTM', 1, 80, 'Patio CENMA', 'piloto@sct-transmetro.gt'),
      ('P002GTM', 2, 80, 'Patio Central Zona 1', 'piloto2@sct-transmetro.gt'),
      ('P003GTM', 3, 100, 'Patio Norte', 'piloto3@sct-transmetro.gt'),
      ('P004GTM', 4, 80, 'Patio CENMA', 'piloto4@sct-transmetro.gt'),
      ('P005GTM', 5, 100, 'Patio Central Zona 1', 'piloto5@sct-transmetro.gt'),
      ('P006GTM', 6, 80, 'Patio Norte', 'piloto6@sct-transmetro.gt')
    ) AS v(placa, num_unidad, capacidad_maxima, parqueo, piloto_correo)
    INNER JOIN linea l ON l.codigo = 'L1'
    INNER JOIN (
      SELECT MIN(id_parqueo) AS id_parqueo, ubicacion
      FROM parqueo
      GROUP BY ubicacion
    ) p ON p.ubicacion = v.parqueo
    LEFT JOIN empleado piloto ON piloto.correo = v.piloto_correo
    WHERE NOT EXISTS (SELECT 1 FROM bus b WHERE b.placa = v.placa)
    ON CONFLICT DO NOTHING
  `);

  await query(`
    UPDATE bus b
    SET id_piloto = piloto.id_empleado
    FROM (VALUES
      ('P001GTM', 'piloto@sct-transmetro.gt'),
      ('P002GTM', 'piloto2@sct-transmetro.gt'),
      ('P003GTM', 'piloto3@sct-transmetro.gt'),
      ('P004GTM', 'piloto4@sct-transmetro.gt'),
      ('P005GTM', 'piloto5@sct-transmetro.gt'),
      ('P006GTM', 'piloto6@sct-transmetro.gt')
    ) AS v(placa, piloto_correo)
    INNER JOIN empleado piloto ON piloto.correo = v.piloto_correo
    WHERE b.placa = v.placa
  `);

  await query(`
    INSERT INTO recorrido (id_bus, id_linea, id_operador, fecha)
    SELECT b.id_bus, l.id_linea, op.id_empleado, CURRENT_DATE
    FROM bus b
    INNER JOIN linea l ON l.codigo = 'L1'
    INNER JOIN empleado op ON op.correo = 'operador@sct-transmetro.gt'
    WHERE b.placa = 'P001GTM'
      AND NOT EXISTS (
        SELECT 1 FROM recorrido r
        WHERE r.id_bus = b.id_bus AND r.id_linea = l.id_linea AND r.fecha = CURRENT_DATE
      )
  `);

  console.log('Seed completado.');
  console.log('Admin: admin@sct-transmetro.gt / admin123');
  console.log('Operador: operador@sct-transmetro.gt / operador123');
  console.log('Supervisor: supervisor@sct-transmetro.gt / supervisor123');
  console.log('Piloto: guardia@sct-transmetro.gt / guardia123');
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
