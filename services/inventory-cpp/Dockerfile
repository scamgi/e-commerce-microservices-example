# Stage 1: Builder
# Use a base image with GCC and CMake installed
FROM alpine:3.18 AS builder

# Install build dependencies
RUN apk add --no-cache build-base cmake git hiredis-dev

WORKDIR /app

# --- Clone and build dependencies ---

# 1. Clone and build redis-plus-plus
RUN git clone https://github.com/sewenew/redis-plus-plus.git
WORKDIR /app/redis-plus-plus/build
# This command will find the hiredis headers and succeed
RUN cmake .. -DREDIS_PLUS_PLUS_CXX_STANDARD=17 && make && make install

# 2. Clone Crow and copy its headers
WORKDIR /app
RUN git clone https://github.com/CrowCpp/Crow.git
RUN cp -r /app/Crow/include/* /usr/local/include/

# --- Copy and build the application ---
WORKDIR /app
COPY . .

# Update CMakeLists to find and link redis-plus-plus
RUN echo 'find_package(redis-plus-plus REQUIRED)' >> CMakeLists.txt
RUN echo 'target_link_libraries(inventory_server Threads::Threads redis-plus-plus::redis-plus-plus)' >> CMakeLists.txt

# Build the application
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