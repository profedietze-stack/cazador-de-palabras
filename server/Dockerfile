FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY src ./src
COPY tsconfig*.json ./
# Los tests viven en src/__tests__ y no se compilan en la imagen (tsconfig.build.json).
RUN npx tsc -p tsconfig.build.json

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3001
# No correr como root (hallazgo SEG-17): el servidor solo escucha un puerto alto.
USER node
CMD ["node", "dist/index.js"]
