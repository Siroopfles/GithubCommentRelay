FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies needed for SQLite and Prisma
RUN apk add --no-cache openssl build-base sqlite

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

# Create necessary directories
RUN mkdir -p logs data

# Expose the port Next.js runs on
EXPOSE 3000

# Start command handles migrations, starting the web UI, and the background worker
CMD ["sh", "-c", "npx prisma migrate deploy && (npm start & node worker.js)"]
