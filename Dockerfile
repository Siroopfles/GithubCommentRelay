FROM node:24-alpine

# Set working directory
WORKDIR /app

# Install dependencies needed for SQLite, Prisma, and process management
RUN apk add --no-cache openssl build-base sqlite tini

# Create necessary directories and a non-root user
RUN mkdir -p logs data \
 && addgroup -S app && adduser -S app -G app \
 && chown -R app:app /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install project dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the Next.js app and the worker
RUN npm run build

# Make sure permissions are correct after build
RUN chown -R app:app /app

# Use non-root user
USER app

# Expose the port Next.js runs on
EXPOSE 3000

# Use tini to reap zombies and forward signals
ENTRYPOINT ["/sbin/tini", "--"]

# Start command handles migrations, starting the web UI, and the background worker properly
CMD ["sh", "-c", "npx prisma migrate deploy && (npm start & node worker.js & wait)"]
