# Dockerfile para despliegue en la nube de TequisDelivery Backend
FROM node:20-alpine

WORKDIR /app

# Instalar herramientas de compilación para librerías nativas como sqlite3
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --only=production

COPY . .

EXPOSE 4000

ENV PORT=4000
ENV NODE_ENV=production

CMD ["node", "server.js"]
