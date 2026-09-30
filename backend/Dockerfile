# Dockerfile para despliegue en la nube de TequisDelivery Backend
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 4000

ENV PORT=4000
ENV NODE_ENV=production

CMD ["node", "server.js"]
