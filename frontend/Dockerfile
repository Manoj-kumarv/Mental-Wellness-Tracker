# ─────────────────────────────────────────────────────────────────────────────
# MindEase Frontend — Production Dockerfile
# Multi-stage: build React app, serve with Nginx
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --silent

# Build
COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# ─── Serve with Nginx ─────────────────────────────────────────────────────────
FROM nginx:alpine AS runner

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom Nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Security headers
RUN echo 'server_tokens off;' > /etc/nginx/conf.d/security.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
