FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN DATABASE_URL="file:/tmp/build.db" npx prisma migrate deploy
RUN DATABASE_URL="file:/tmp/build.db" npm run build

RUN mkdir -p /app/data

EXPOSE 3000
CMD DATABASE_URL="file:/app/dev.db" npx prisma migrate deploy && DATABASE_URL="file:/app/dev.db" npm start
