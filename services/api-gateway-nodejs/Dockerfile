# services/api-gateway-nodejs/Dockerfile
FROM oven/bun:latest

WORKDIR /app

# Copy package.json and bun.lock to leverage Docker cache
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of your application code
COPY . .

# Expose the port the gateway runs on
EXPOSE 8080

# The command to run your application
CMD ["bun", "run", "index.ts"]