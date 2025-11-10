# services/inventory-cpp/Dockerfile

# ---- Build Stage ----
# Use a base image with a C++ compiler
FROM gcc:11.2.0 AS builder

WORKDIR /app

# --- FIX: Install CMake ---
# First, update the package lists, then install cmake.
# The '-y' flag automatically answers 'yes' to any prompts.
RUN apt-get update && apt-get install -y cmake

# Copy the source code
COPY . .

# Create a build directory
RUN cmake -B ./build

# Compile the project
RUN cmake --build ./build -j "$(nproc)"

# ---- Runtime Stage ----
# Use a minimal base image for the final container
FROM alpine:latest

WORKDIR /app

# Copy the compiled executable from the builder stage
COPY --from=builder /app/build/inventory_service .

EXPOSE 8083

# Command to run the service
CMD ["./inventory_service"]