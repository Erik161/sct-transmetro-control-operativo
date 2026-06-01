# AWS

El prototipo se despliega en una instancia AWS EC2 mediante Docker Compose.

La guia de instalacion y actualizacion se encuentra en `DEPLOY_EC2.md`.

## Servicios definidos por el proyecto

- EC2: servidor de aplicacion.
- RDS PostgreSQL: base de datos administrada.
- S3: almacenamiento de archivos, exportaciones y respaldos adicionales.
- CloudWatch: monitoreo de logs y alertas.

## Requisitos de produccion

- HTTPS obligatorio.
- Respaldos automaticos diarios con retencion minima de 7 dias.
- Variables de entorno para secretos y conexion a base de datos.
- Monitoreo de disponibilidad del servidor.
