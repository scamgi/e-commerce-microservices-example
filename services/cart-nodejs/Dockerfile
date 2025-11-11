# services/cart-nodejs/Dockerfile
FROM oven/bun:latest

WORKDIR /app

# Copy package.json and bun.lock to leverage Docker cache
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of your application code
COPY . .

# Expose the port the app runs on
EXPOSE 8084

# The command to run your application
CMD ["bun", "run", "index.ts"]