// services/inventory-cpp/main.cpp
#include "crow.h"
#include <sw/redis++/redis++.h>
#include <iostream>
#include <string>
#include <memory>

int main() {
    // --- Connect to Redis ---
    std::unique_ptr<sw::redis::Redis> redis;
    try {
        // Get Redis host from environment variable, default to 'localhost' if not set
        const char* redis_host_env = std::getenv("REDIS_HOST");
        std::string redis_host = redis_host_env ? redis_host_env : "localhost";
        
        sw::redis::ConnectionOptions connOpts;
        connOpts.host = redis_host;
        connOpts.port = 6379;
        connOpts.socket_timeout = std::chrono::milliseconds(500);

        redis = std::make_unique<sw::redis::Redis>(connOpts);
        std::cout << "Successfully connected to Redis at " << redis_host << std::endl;

    } catch (const sw::redis::Error &e) {
        std::cerr << "Failed to connect to Redis: " << e.what() << std::endl;
        return 1; // Exit if we can't connect
    }

    // --- Initialize Crow Web Framework ---
    crow::SimpleApp app;

    // --- API Routes ---

    // GET /inventory/<product_id>
    // Checks the stock for a given product ID.
    CROW_ROUTE(app, "/inventory/<string>")
    ([&redis](const std::string& product_id) {
        try {
            auto key = "inventory:" + product_id;
            auto stock_str = redis->get(key);
            
            if (stock_str) {
                // Key exists, return its value
                return crow::response(200, *stock_str);
            } else {
                // Key doesn't exist, assume stock is 0
                return crow::response(200, "0");
            }
        } catch (const sw::redis::Error &e) {
            return crow::response(500, "{\"error\": \"Redis error\"}");
        }
    });

    // POST /inventory/increase
    // Increases stock for a product. Expects JSON: {"productId": "...", "amount": ...}
    CROW_ROUTE(app, "/inventory/increase").methods("POST"_method)
    ([&redis](const crow::request& req) {
        auto body = crow::json::load(req.body);
        if (!body || !body.has("productId") || !body.has("amount")) {
            return crow::response(400, "{\"error\": \"Missing productId or amount\"}");
        }

        try {
            std::string product_id = body["productId"].s();
            int amount = body["amount"].i();
            auto key = "inventory:" + product_id;

            long long new_stock = redis->incrby(key, amount);
            
            crow::json::wvalue res({{"productId", product_id}, {"newStock", new_stock}});
            return crow::response(200, res);
        } catch (const sw::redis::Error &e) {
            return crow::response(500, "{\"error\": \"Redis error\"}");
        }
    });

    // POST /inventory/decrease
    // Decreases stock for a product. Expects JSON: {"productId": "...", "amount": ...}
    CROW_ROUTE(app, "/inventory/decrease").methods("POST"_method)
    ([&redis](const crow::request& req) {
        auto body = crow::json::load(req.body);
        if (!body || !body.has("productId") || !body.has("amount")) {
            return crow::response(400, "{\"error\": \"Missing productId or amount\"}");
        }

        try {
            std::string product_id = body["productId"].s();
            int amount = body["amount"].i();
            auto key = "inventory:" + product_id;

            // Optional: Check if stock would go below zero (atomic operation is complex, simple check here)
            // For a robust system, a Lua script in Redis would be better.
            auto current_stock_str = redis->get(key);
            if (!current_stock_str || std::stoi(*current_stock_str) < amount) {
                return crow::response(409, "{\"error\": \"Insufficient stock\"}");
            }

            long long new_stock = redis->decrby(key, amount);

            crow::json::wvalue res({{"productId", product_id}, {"newStock", new_stock}});
            return crow::response(200, res);

        } catch (const sw::redis::Error &e) {
            return crow::response(500, "{\"error\": \"Redis error\"}");
        }
    });


    // --- Start Server ---
    app.port(8083).multithreaded().run();
    
    return 0;
}