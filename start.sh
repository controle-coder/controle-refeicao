#!/bin/sh
echo "START.SH EXECUTADO"
npx prisma migrate deploy
echo "PORT=${PORT} NODE_ENV=${NODE_ENV}"
ls -la /app/.next/ 2>/dev/null || echo "ERRO: .next nao existe"
exec npx next start -p ${PORT:-3000} -H 0.0.0.0
