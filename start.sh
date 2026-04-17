#!/bin/sh
set -e
echo "=== Iniciando migrate ==="
npx prisma migrate deploy
echo "=== Migrate OK, iniciando Next.js na porta ${PORT:-3000} ==="
exec npx next start -p ${PORT:-3000} -H 0.0.0.0
