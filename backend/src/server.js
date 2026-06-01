const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Server } = require('socket.io');
const env = require('./config/env');
const { pool } = require('./db/pool');
const { configureSocket } = require('./realtime/socket');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: env.clientUrl,
    credentials: true
  }
});

app.set('io', io);
configureSocket(io);

app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json());
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.get('/api/health', async (req, res) => {
  const db = await pool.query('SELECT NOW() AS now');
  res.json({
    sistema: 'Sistema de Control de Transmetro',
    estado: 'activo',
    database: db.rows[0].now
  });
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/municipalidades', require('./routes/municipalidades.routes'));
app.use('/api/empleados', require('./routes/empleados.routes'));
app.use('/api/usuarios', require('./routes/usuarios.routes'));
app.use('/api/lineas', require('./routes/lineas.routes'));
app.use('/api/estaciones', require('./routes/estaciones.routes'));
app.use('/api/accesos', require('./routes/accesos.routes'));
app.use('/api/parqueos', require('./routes/parqueos.routes'));
app.use('/api/buses', require('./routes/buses.routes'));
app.use('/api/guardias', require('./routes/guardias.routes'));
app.use('/api/recorridos', require('./routes/recorridos.routes'));
app.use('/api/alertas', require('./routes/alertas.routes'));
app.use('/api/operacion', require('./routes/operacion.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({
    error: error.publicMessage || 'Error interno del servidor.',
    detalle: env.nodeEnv === 'production' ? undefined : error.message
  });
});

server.listen(env.port, () => {
  console.log(`SCT Transmetro API en http://localhost:${env.port}`);
});
