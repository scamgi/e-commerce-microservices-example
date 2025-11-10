# services/inventory-cpp/CMakeLists.txt
cmake_minimum_required(VERSION 3.14)
project(InventoryService)

set(CMAKE_CXX_STANDARD 17)

# --- Dependency Management with FetchContent ---

# Include the FetchContent module to download dependencies
include(FetchContent)

# Declare the Crow dependency
FetchContent_Declare(
  crow
  GIT_REPOSITORY https://github.com/CrowCpp/Crow.git
  GIT_TAG        v1.1.0
)

# Declare the redis-plus-plus dependency
FetchContent_Declare(
  redis-plus-plus
  GIT_REPOSITORY https://github.com/sewenew/redis-plus-plus.git
  GIT_TAG        1.3.6 # Use a specific, stable version
)

# Make the dependencies available to our project
FetchContent_MakeAvailable(crow redis-plus-plus)


# --- Build Target ---

# Create our executable
add_executable(inventory_service main.cpp)

# Link our executable against the libraries
target_link_libraries(inventory_service PRIVATE crow::crow hiredis redis++)