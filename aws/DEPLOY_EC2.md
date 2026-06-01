# Despliegue En EC2

## Requisitos

- Instancia EC2 con Linux.
- Acceso SSH.
- Docker instalado.
- Puertos HTTP y HTTPS habilitados en el grupo de seguridad.

## Preparacion Del Servidor

```bash
sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
```

## Ejecucion

```bash
cp .env.production.example .env.production
nano .env.production
sh scripts/deploy-ec2.sh
```

Las credenciales, direcciones y secretos del entorno deben configurarse fuera del repositorio.
