#!/bin/sh
npx prisma migrate deploy
npx next start -p ${PORT:-3000}
