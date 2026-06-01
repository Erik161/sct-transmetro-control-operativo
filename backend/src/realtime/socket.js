function configureSocket(io) {
  io.on('connection', (socket) => {
    socket.on('join:linea', (lineaId) => {
      socket.join(`linea:${lineaId}`);
    });

    socket.on('join:estacion', (estacionId) => {
      socket.join(`estacion:${estacionId}`);
    });
  });
}

function emitAlerta(req, alerta) {
  const io = req.app.get('io');
  if (!io) return;

  io.emit('nueva_alerta', alerta);
  if (alerta.id_linea) io.to(`linea:${alerta.id_linea}`).emit('nueva_alerta', alerta);
  if (alerta.id_estacion) io.to(`estacion:${alerta.id_estacion}`).emit('nueva_alerta', alerta);
}

module.exports = { configureSocket, emitAlerta };
