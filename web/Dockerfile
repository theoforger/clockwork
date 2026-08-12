# --- Build stage -------------------------------------------------------
FROM node:24-alpine AS builder
WORKDIR /app

RUN corepack enable

# Install dependencies first so they're cached independently of app code.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Vite inlines VITE_* variables into the bundle at build time, so the API
# origin has to be baked in here rather than configured at container start.
ARG VITE_API_BASE_URL=http://localhost:3000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN pnpm build

# --- Runtime stage -------------------------------------------------------
FROM caddy:2-alpine AS runtime

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/dist /srv

EXPOSE 80
