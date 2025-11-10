cmake_minimum_required(VERSION 3.10)
project(InventoryService)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find necessary libraries
find_package(Threads REQUIRED)

# Add your source files
add_executable(inventory_server main.cpp)

# Target specific libraries to link
# We will add libraries like Crow and redis-plus-plus here later