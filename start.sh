#!/bin/sh
echo "=== Migrate ==="
npx prisma migrate deploy
echo "=== Migrate concluído, iniciando Next.js ==="
echo "PORT=${PORT}"
echo "NODE_ENV=${NODE_ENV}"
ls -la .next/ 2>/dev/null || echo "ERRO: pasta .next nao encontrada!"
exec npx next start -p ${PORT:-3000} -H 0.0.0.0
