INSERT INTO municipalidad (nombre) VALUES
  ('Municipalidad de Guatemala');

INSERT INTO parqueo (ubicacion) VALUES
  ('Patio Central Zona 1'),
  ('Patio Sur'),
  ('Patio Norte');

INSERT INTO empleado (nombre, dpi, formacion_academica, direccion, telefono, correo, cargo) VALUES
  ('Administrador General', '0000000000001', NULL, 'Ciudad de Guatemala', '00000000', 'admin@transmetro.local', 'Administrador'),
  ('Operador Demo', '0000000000002', NULL, 'Ciudad de Guatemala', '00000001', 'operador@transmetro.local', 'Operador'),
  ('Supervisor Demo', '0000000000003', NULL, 'Ciudad de Guatemala', '00000002', 'supervisor@transmetro.local', 'Supervisor'),
  ('Guardia Demo', '0000000000004', NULL, 'Ciudad de Guatemala', '00000003', 'guardia@transmetro.local', 'Guardia'),
  ('Piloto Demo', '0000000000005', 'Diversificado', 'Ciudad de Guatemala', '00000004', 'piloto@transmetro.local', 'Piloto');

-- Las contrasenas reales deben insertarse con hash bcrypt desde el backend.
