require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool, query } = require('../src/db/pool');

async function seedPublicOfficial() {
  const file = path.resolve(__dirname, 'transmetro-publico-oficial.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));

  await query(`
    ALTER TABLE linea
    ADD COLUMN IF NOT EXISTS fuente_url VARCHAR(300)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS horario_linea (
      id_horario SERIAL PRIMARY KEY,
      id_linea INT NOT NULL REFERENCES linea(id_linea) ON DELETE CASCADE,
      dia_tipo VARCHAR(30) NOT NULL CHECK (dia_tipo IN ('lunes_viernes', 'sabado', 'domingo_festivos')),
      hora_inicio TIME,
      hora_fin TIME,
      descripcion VARCHAR(100) NOT NULL,
      UNIQUE (id_linea, dia_tipo)
    )
  `);

  await query(`
    INSERT INTO municipalidad (nombre)
    SELECT $1::varchar
    WHERE NOT EXISTS (SELECT 1 FROM municipalidad WHERE nombre = $1::varchar)
  `, [data.municipalidad]);

  for (const linea of data.lineas) {
    const inserted = await query(`
      INSERT INTO linea (nombre, codigo, id_municipalidad, fuente_url)
      SELECT $1, $2, m.id_municipalidad, $4
      FROM municipalidad m
      WHERE m.nombre = $3
      ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, fuente_url = EXCLUDED.fuente_url
      RETURNING id_linea
    `, [linea.nombre, linea.codigo, data.municipalidad, linea.url]);

    const idLinea = inserted.rows[0].id_linea;

    for (const [diaTipo, descripcion] of Object.entries(linea.horarios || {})) {
      const match = descripcion.match(/(\d{1,2}:\d{2}).*?(\d{1,2}:\d{2})/);
      await query(`
        INSERT INTO horario_linea (id_linea, dia_tipo, hora_inicio, hora_fin, descripcion)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id_linea, dia_tipo)
        DO UPDATE SET hora_inicio = EXCLUDED.hora_inicio, hora_fin = EXCLUDED.hora_fin, descripcion = EXCLUDED.descripcion
      `, [idLinea, diaTipo, match ? match[1] : null, match ? match[2] : null, descripcion]);
    }

    if (Array.isArray(linea.estaciones)) {
      await query('DELETE FROM linea_estacion WHERE id_linea = $1', [idLinea]);
      let orden = 1;

      for (const estacion of linea.estaciones) {
        const [nombre, ubicacion] = estacion;
        const estacionResult = await query(`
          INSERT INTO estacion (nombre, ubicacion, id_municipalidad)
          SELECT $1::varchar, $2::varchar, m.id_municipalidad
          FROM municipalidad m
          WHERE m.nombre = $3
            AND NOT EXISTS (
              SELECT 1 FROM estacion e WHERE e.nombre = $1::varchar AND e.ubicacion = $2::varchar
            )
          RETURNING id_estacion
        `, [nombre, ubicacion, data.municipalidad]);

        let idEstacion = estacionResult.rows[0]?.id_estacion;
        if (!idEstacion) {
          const existing = await query(
            'SELECT id_estacion FROM estacion WHERE nombre = $1 AND ubicacion = $2 LIMIT 1',
            [nombre, ubicacion]
          );
          idEstacion = existing.rows[0].id_estacion;
        }

        await query(`
          INSERT INTO linea_estacion (id_linea, id_estacion, orden, distancia_anterior)
          VALUES ($1, $2, $3, 0)
          ON CONFLICT DO NOTHING
        `, [idLinea, idEstacion, orden]);

        for (const tipo of ['entrada', 'salida']) {
          await query(`
            INSERT INTO acceso (tipo, id_estacion)
            SELECT $1::varchar, $2
            WHERE NOT EXISTS (
              SELECT 1 FROM acceso WHERE tipo = $1::varchar AND id_estacion = $2
            )
          `, [tipo, idEstacion]);
        }

        orden += 1;
      }
    }
  }

  console.log(`Lineas oficiales cargadas: ${data.lineas.length}`);
}

seedPublicOfficial()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
