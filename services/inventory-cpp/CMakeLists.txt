cmake_minimum_required(VERSION 3.10)
project(InventoryService)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find necessary packages
find_package(Threads REQUIRED)
find_package(redis-plus-plus REQUIRED)

# Add your source files
add_executable(inventory_server main.cpp)

# Link the libraries to your executable
target_link_libraries(inventory_server
    PRIVATE
    Threads::Threads
    redis-plus-plus::redis-plus-plus
)