# Multi-stage build. Produces a small, non-root runtime image suitable
# for Proxmox LXC, docker-compose, or Kubernetes.

FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci --no-audit --no-fund

COPY src ./src
COPY agents ./agents
RUN npx tsc

# ---

FROM node:22-alpine AS runtime
WORKDIR /app

# Non-root user for the agent process
RUN addgroup -S adp && adduser -S adp -G adp

COPY --from=build /app/dist ./dist
COPY --from=build /app/agents ./agents
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

RUN mkdir -p /var/lib/adp/journal && chown -R adp:adp /var/lib/adp /app

USER adp

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:3000/healthz || exit 1

CMD ["node", "dist/src/index.js", "--config", "agents/example.json"]
