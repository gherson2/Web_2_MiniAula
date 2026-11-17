#!/bin/sh
set -eu
# Si no se configura un secreto estable, generar uno privado para este arranque.
# Para conservar sesiones al recrear el contenedor, definir JWT_SECRET en .env.
if [ -z "${JWT_SECRET:-}" ]; then
  JWT_SECRET="$(node -e "process.stdout.write(require('node:crypto').randomBytes(48).toString('hex'))")"
  export JWT_SECRET
fi
exec node index.js
