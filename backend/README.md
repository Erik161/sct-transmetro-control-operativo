# Backend

API del Sistema de Control de Transmetro.

## Tecnologias

- Node.js
- Express
- PostgreSQL
- Socket.IO
- JWT
- bcrypt

## Modulos

- Autenticacion y autorizacion por roles.
- Municipalidades, lineas y estaciones.
- Accesos y cobertura de seguridad.
- Parqueos y buses.
- Personal y usuarios.
- Recorridos y control de capacidad.
- Alertas operativas.

## Reglas Principales

- Cada bus debe tener un parqueo asignado.
- Un bus solo puede pertenecer a una linea.
- Cada linea requiere entre N y 2N buses, donde N es la cantidad de estaciones.
- Se genera una alerta cuando la demanda supera el 50% de la capacidad del bus.
- Se recomienda una espera de 5 minutos cuando la ocupacion es menor al 25%.
- Los accesos de las estaciones deben contar con cobertura de seguridad.

## Ejecucion

```bash
npm install
npm run start
```
