# Production image: API + admin dashboard (served by the API at /admin).
# Build context is the repository root:  docker build -t portfolio-api .
# (Built and run on AWS — not needed on the development laptop.)

FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/admin/package.json apps/admin/
COPY apps/web/package.json apps/web/
RUN npm ci
COPY . .
RUN npm run build -w @pg/shared \
 && npx -w @pg/api prisma generate \
 && npm run build -w @pg/api \
 && npm run build -w @pg/admin
RUN npm prune --omit=dev

FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=4000 ADMIN_DIST_DIR=/app/apps/admin/dist
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/* \
 && useradd --system --uid 10001 app
COPY --from=build --chown=app /app/node_modules ./node_modules
COPY --from=build --chown=app /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build --chown=app /app/packages/shared/dist ./packages/shared/dist
COPY --from=build --chown=app /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=app /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=app /app/apps/api/prisma ./apps/api/prisma
COPY --from=build --chown=app /app/apps/admin/dist ./apps/admin/dist
USER app
WORKDIR /app/apps/api
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Apply pending migrations, then start.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
