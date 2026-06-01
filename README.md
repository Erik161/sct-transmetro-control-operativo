# Sistema De Control Operativo Para Transmetro

Aplicacion web para centralizar la administracion y supervision operativa de la red de transporte Transmetro. El sistema permite consultar lineas, estaciones, buses, personal, cobertura de seguridad y alertas de capacidad desde una interfaz unificada.

## Objetivo

Facilitar la toma de decisiones operativas mediante informacion organizada sobre la flota, los recorridos, la demanda de pasajeros y la asignacion de personal en estaciones.

## Funcionalidades

- Dashboard diferenciado por rol.
- Gestion de lineas, estaciones, buses y personal.
- Control de flota segun la regla operativa N-2N.
- Consulta cartografica de recorridos y estaciones.
- Visualizacion de buses, pilotos y parqueos asignados.
- Consulta de cobertura de seguridad por estacion.
- Evaluacion de capacidad de buses.
- Generacion de alertas por sobredemanda o baja ocupacion.
- Actualizacion de alertas mediante Socket.IO.

## Roles

| Rol | Acceso principal |
| --- | --- |
| Administrador | Gestion completa de catalogos, personal y configuracion operativa |
| Supervisor | Consulta de red, personal, alertas y cobertura |
| Operador | Consulta de recorridos y registro de capacidad |
| Piloto | Consulta de unidad, linea, horarios y estaciones asignadas |

## Tecnologias

- Frontend: React, Vite, Tailwind CSS y Leaflet.
- Backend: Node.js, Express y Socket.IO.
- Base de datos: PostgreSQL.
- Contenedores: Docker y Docker Compose.
- Despliegue: AWS EC2.

## Arquitectura

```text
Navegador
   |
Frontend React
   |
API REST + Socket.IO
   |
PostgreSQL
```

## Estructura Del Repositorio

| Directorio | Contenido |
| --- | --- |
| `frontend/` | Interfaz web, componentes y pantallas |
| `backend/` | API, autenticacion, permisos y reglas de negocio |
| `database/` | Esquema SQL y datos iniciales |
| `aws/` | Guia de despliegue en EC2 |
| `scripts/` | Script automatizado de despliegue |
| `tools/` | Utilidad para preparar datos cartograficos |

## Ejecucion Local

Requisitos:

- Docker Desktop.
- Docker Compose.

Iniciar los servicios:

```bash
docker compose up --build -d
```

Cargar los datos iniciales:

```bash
docker compose exec backend npm run db:seed:public
docker compose exec backend npm run db:seed
```

Servicios disponibles:

- Frontend: `http://localhost:5173`
- Estado del backend: `http://localhost:4000/api/health`

## Base De Datos

El repositorio incluye:

- `database/schema.sql`: estructura de PostgreSQL.
- `database/seed.sql`: datos iniciales de referencia.
- `backend/database/seed-public-official.js`: carga de lineas y estaciones.
- `backend/database/seed.js`: carga de usuarios y datos operativos.

## Usuarios De Demostracion

| Rol | Correo | Contrasena |
| --- | --- | --- |
| Administrador | `admin@sct-transmetro.gt` | `admin123` |
| Operador | `operador@sct-transmetro.gt` | `operador123` |
| Supervisor | `supervisor@sct-transmetro.gt` | `supervisor123` |
| Piloto | `guardia@sct-transmetro.gt` | `guardia123` |

Las credenciales se utilizan exclusivamente para demostrar los permisos de cada rol.

## Despliegue En AWS

La configuracion para EC2 se encuentra en:

- `docker-compose.prod.yml`
- `.env.production.example`
- `scripts/deploy-ec2.sh`
- `aws/DEPLOY_EC2.md`

Los secretos del servidor deben configurarse mediante variables de entorno y no deben incluirse en el repositorio.

## Enlaces De Entrega

- Sistema desplegado: [http://32.196.225.199](http://32.196.225.199)
- Repositorio: [github.com/Erik161/sct-transmetro-control-operativo](https://github.com/Erik161/sct-transmetro-control-operativo)
- Material de entrega, video y presentacion ejecutiva: [Carpeta publica de Google Drive](https://drive.google.com/drive/folders/1rNMYj7qidFFTBz4DwhOPin8PUCF52ZEB?usp=sharing)

## Alcance Academico

Proyecto desarrollado como propuesta de mejora para la supervision operativa del servicio de transporte urbano.
