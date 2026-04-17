#!/bin/sh
npx prisma migrate deploy
npm start -- -p ${PORT:-3000}
