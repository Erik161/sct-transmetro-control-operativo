CREATE TABLE empleado (
  id_empleado SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  dpi VARCHAR(13) UNIQUE NOT NULL,
  formacion_academica VARCHAR(200),
  direccion VARCHAR(200) NOT NULL,
  telefono VARCHAR(15) NOT NULL,
  correo VARCHAR(150) UNIQUE NOT NULL,
  cargo VARCHAR(20) NOT NULL CHECK (cargo IN ('Piloto', 'Guardia', 'Operador', 'Supervisor', 'Administrador'))
);

CREATE TABLE usuario (
  id_usuario SERIAL PRIMARY KEY,
  id_empleado INT UNIQUE NOT NULL REFERENCES empleado(id_empleado),
  contrasena VARCHAR(255) NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('Guardia', 'Operador', 'Supervisor', 'Administrador'))
);

CREATE TABLE municipalidad (
  id_municipalidad SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL
);

CREATE TABLE linea (
  id_linea SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  id_municipalidad INT NOT NULL REFERENCES municipalidad(id_municipalidad),
  distancia_total DECIMAL(10, 2) DEFAULT 0,
  fuente_url VARCHAR(300)
);

CREATE TABLE horario_linea (
  id_horario SERIAL PRIMARY KEY,
  id_linea INT NOT NULL REFERENCES linea(id_linea) ON DELETE CASCADE,
  dia_tipo VARCHAR(30) NOT NULL CHECK (dia_tipo IN ('lunes_viernes', 'sabado', 'domingo_festivos')),
  hora_inicio TIME,
  hora_fin TIME,
  descripcion VARCHAR(100) NOT NULL,
  UNIQUE (id_linea, dia_tipo)
);

CREATE TABLE estacion (
  id_estacion SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  ubicacion VARCHAR(200) NOT NULL,
  id_municipalidad INT NOT NULL REFERENCES municipalidad(id_municipalidad)
);

CREATE TABLE linea_estacion (
  id_linea INT NOT NULL REFERENCES linea(id_linea) ON DELETE CASCADE,
  id_estacion INT NOT NULL REFERENCES estacion(id_estacion),
  orden INT NOT NULL,
  distancia_anterior DECIMAL(10, 2) DEFAULT 0,
  PRIMARY KEY (id_linea, id_estacion),
  UNIQUE (id_linea, orden)
);

CREATE TABLE acceso (
  id_acceso SERIAL PRIMARY KEY,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  id_estacion INT NOT NULL REFERENCES estacion(id_estacion) ON DELETE CASCADE
);

CREATE TABLE asignacion_guardia (
  id_empleado INT NOT NULL REFERENCES empleado(id_empleado),
  id_acceso INT NOT NULL REFERENCES acceso(id_acceso) ON DELETE CASCADE,
  fecha_asignacion DATE NOT NULL,
  PRIMARY KEY (id_empleado, id_acceso)
);

CREATE TABLE parqueo (
  id_parqueo SERIAL PRIMARY KEY,
  ubicacion VARCHAR(200) NOT NULL
);

CREATE TABLE bus (
  id_bus SERIAL PRIMARY KEY,
  placa VARCHAR(10) UNIQUE NOT NULL,
  num_unidad INT UNIQUE NOT NULL,
  capacidad_maxima INT NOT NULL CHECK (capacidad_maxima > 0),
  id_linea INT REFERENCES linea(id_linea),
  id_parqueo INT NOT NULL REFERENCES parqueo(id_parqueo),
  id_piloto INT UNIQUE REFERENCES empleado(id_empleado)
);

CREATE TABLE recorrido (
  id_recorrido SERIAL PRIMARY KEY,
  id_bus INT NOT NULL REFERENCES bus(id_bus),
  id_linea INT NOT NULL REFERENCES linea(id_linea),
  id_operador INT NOT NULL REFERENCES empleado(id_empleado),
  fecha DATE NOT NULL
);

CREATE TABLE detalle_recorrido (
  id_detalle SERIAL PRIMARY KEY,
  id_recorrido INT NOT NULL REFERENCES recorrido(id_recorrido) ON DELETE CASCADE,
  id_estacion INT NOT NULL REFERENCES estacion(id_estacion),
  hora_llegada TIME NOT NULL,
  hora_salida TIME,
  pasajeros_subieron INT DEFAULT 0 CHECK (pasajeros_subieron >= 0),
  pasajeros_bajaron INT DEFAULT 0 CHECK (pasajeros_bajaron >= 0)
);

CREATE TABLE alerta (
  id_alerta SERIAL PRIMARY KEY,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('sobredemanda', 'baja_ocupacion')),
  id_recorrido INT NOT NULL REFERENCES recorrido(id_recorrido),
  id_estacion INT NOT NULL REFERENCES estacion(id_estacion),
  id_operador INT NOT NULL REFERENCES empleado(id_empleado),
  fecha_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  descripcion TEXT
);

CREATE INDEX idx_bus_linea ON bus(id_linea);
CREATE INDEX idx_linea_estacion_linea ON linea_estacion(id_linea);
CREATE INDEX idx_recorrido_fecha ON recorrido(fecha);
CREATE INDEX idx_alerta_fecha_hora ON alerta(fecha_hora);
