FROM node:20-alpine AS base
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate prisma client inside builder
RUN npx prisma generate

# Build Next.js and Worker
RUN npm run build

# Runner
FROM base AS runner
ENV NODE_ENV=production

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# We use a script to run either the web server or the worker based on an env var
COPY scripts/start.sh /app/start.sh
RUN chmod +x /app/start.sh && chown node:node /app/start.sh

# Ensure the mounted volume paths are writable by the node user
RUN mkdir -p /app/data /app/logs && chown -R node:node /app/data /app/logs

USER node

CMD ["/app/start.sh"]
