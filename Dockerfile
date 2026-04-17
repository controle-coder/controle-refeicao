FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN DATABASE_URL="file:/tmp/build.db" npx prisma generate
RUN DATABASE_URL="file:/tmp/build.db" npx prisma migrate deploy
RUN DATABASE_URL="file:/tmp/build.db" npm run build

RUN mkdir -p /app/data

EXPOSE 3000
CMD ["sh", "-c", "echo INICIANDO && npx prisma migrate deploy && echo NEXT && exec npx next start -p ${PORT:-3000} -H 0.0.0.0"]
