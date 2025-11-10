# services/inventory-cpp/CMakeLists.txt
cmake_minimum_required(VERSION 3.10)
project(InventoryService)

set(CMAKE_CXX_STANDARD 17)

add_executable(inventory_service main.cpp)