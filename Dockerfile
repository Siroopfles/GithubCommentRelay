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

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# We use a script to run either the web server or the worker based on an env var
RUN echo -e '#!/bin/sh\nif [ "$ROLE" = "worker" ]; then\n  npx prisma db push && node dist/worker.js\nelse\n  node server.js\nfi' > /app/start.sh
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
