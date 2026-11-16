# syntax=docker/dockerfile:1

# ---------- Build stage: install deps + build frontend ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Toolchain only needed if better-sqlite3 has no prebuilt binary for this platform.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# VITE_* values are baked into the frontend bundle at build time.
ARG VITE_GEMINI_API_KEY=""
ARG VITE_TURNSTILE_SITE_KEY=""
ARG VITE_APP_URL=""
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY \
    VITE_TURNSTILE_SITE_KEY=$VITE_TURNSTILE_SITE_KEY \
    VITE_APP_URL=$VITE_APP_URL

RUN npm run lint && node --test server/surat-tugas-policy.test.mjs && npm run build \
  && npm prune --omit=dev

# ---------- Runtime stage ----------
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=4100
WORKDIR /app

COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/server ./server
COPY --from=build --chown=node:node /app/api ./api
# Legacy SQLite snapshot: imported once into MySQL when MySQL is still empty.
COPY --from=build --chown=node:node /app/data ./data

USER node
EXPOSE 4100

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4100)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.mjs"]
