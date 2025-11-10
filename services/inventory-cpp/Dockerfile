# services/inventory-cpp/Dockerfile

# ---- Build Stage ----
# Use a base image with a C++ compiler
FROM gcc:11.2.0 AS builder

WORKDIR /app

# Install build tools (cmake) and dependency libraries (hiredis)
RUN apt-get update && apt-get install -y cmake libhiredis-dev

# Copy the source code
COPY . .

# Create a build directory and configure the project
# This will also download Crow and redis-plus-plus via CMake
RUN cmake -B ./build

# Compile the project
RUN cmake --build ./build -j "$(nproc)"

# ---- Runtime Stage ----
# Use a minimal base image for the final container
FROM alpine:latest

# Install the runtime dependency for the redis client
RUN apk add --no-cache hiredis

WORKDIR /app

# Copy the compiled executable from the builder stage
COPY --from=builder /app/build/inventory_service .

EXPOSE 8083

# Command to run the service
CMD ["./inventory_service"]