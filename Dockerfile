FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN DATABASE_URL="file:/tmp/build.db" npx prisma migrate deploy
RUN DATABASE_URL="file:/tmp/build.db" npm run build
EXPOSE 3000
CMD npx prisma migrate deploy && npm start
