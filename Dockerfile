# Stage 1: Build frontend
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src/ ./src/
RUN npm run build

# Stage 2: Production image (pg and bcryptjs are pure JS, no native compilation needed)
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/server.js ./
COPY --from=frontend /app/dist ./public
EXPOSE 3000
CMD ["node", "server.js"]
