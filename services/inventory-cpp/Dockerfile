# Stage 1: Builder
# Use a base image with GCC and CMake installed
FROM alpine:3.18 AS builder

# Install build dependencies
RUN apk add --no-cache build-base cmake git hiredis-dev

WORKDIR /app

# --- Clone and build dependencies ---

# 1. Clone, build, and install redis-plus-plus
RUN git clone https://github.com/sewenew/redis-plus-plus.git
WORKDIR /app/redis-plus-plus/build
RUN cmake .. -DREDIS_PLUS_PLUS_CXX_STANDARD=17 && make && make install

# 2. Clone and copy Crow headers
WORKDIR /app
RUN git clone https://github.com/CrowCpp/Crow.git
RUN cp -r /app/Crow/include/* /usr/local/include/

# --- Copy and build the application ---
WORKDIR /app
COPY . .

# Build the application (The CMakeLists.txt is now complete)
RUN mkdir build && cd build && \
    cmake .. && \
    make

# Stage 2: Final Image
FROM alpine:3.18

# Install runtime dependencies for hiredis and libstdc++
RUN apk add --no-cache libstdc++ hiredis

WORKDIR /app

# Copy the compiled executable from the builder stage
COPY --from=builder /app/build/inventory_server .

EXPOSE 8083

# Run the application
CMD ["./inventory_server"]