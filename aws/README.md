# AWS

Aqui se documentara y configurara la arquitectura de despliegue en AWS.

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
