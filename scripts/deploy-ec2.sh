#!/usr/bin/env sh
set -eu

if [ ! -f .env.production ]; then
  echo "Falta el archivo .env.production"
  exit 1
fi

docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T backend npm run db:seed:public
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T backend npm run db:seed
docker compose --env-file .env.production -f docker-compose.prod.yml ps
