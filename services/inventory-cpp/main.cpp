#include "crow_all.h"
#include <sw/redis++/redis++.h>
#include <iostream>
#include <string>

int main() {
    // --- Redis Connection ---
    sw::redis::Redis redis("tcp://redis-inventory:6379");

    // --- Crow Web Server ---
    crow::SimpleApp app;

    // --- API Routes ---

    // Endpoint to get the inventory for a specific product ID
    // GET /inventory/<product_id>
    CROW_ROUTE(app, "/inventory/<string>")
    ([&redis](const std::string& product_id) {
        try {
            auto stock_str = redis.get("product:" + product_id);
            if (!stock_str) {
                return crow::response(404, "{\"error\": \"Product not found in inventory\"}");
            }
            crow::json::wvalue response;
            response["product_id"] = product_id;
            response["stock"] = std::stoi(*stock_str);
            return crow::response(200, response);
        } catch (const std::exception& e) {
            return crow::response(500, "{\"error\": \"Internal server error\"}");
        }
    });

    // Endpoint to decrease inventory for an order
    // POST /inventory/decrease
    // Body: {"productId": "some-id", "quantity": 2}
    CROW_ROUTE(app, "/inventory/decrease").methods(crow::HTTPMethod::Post)
    ([&redis](const crow::request& req) {
        auto body = crow::json::load(req.body);
        if (!body || !body.has("productId") || !body.has("quantity")) {
            return crow::response(400, "{\"error\": \"Missing productId or quantity\"}");
        }

        std::string product_id = body["productId"].s();
        int quantity_to_decrease = body["quantity"].i();

        // Use Redis transactions to safely decrease the value
        try {
            auto multi = redis.multi();
            auto stock_reply = multi.get("product:" + product_id);
            multi.exec(); // Execute transaction

            if (!stock_reply.get()) {
                 return crow::response(404, "{\"error\": \"Product not found\"}");
            }

            int current_stock = std::stoi(*stock_reply.get());

            if (current_stock < quantity_to_decrease) {
                return crow::response(409, "{\"error\": \"Insufficient stock\"}");
            }

            // If stock is sufficient, decrease it
            long long new_stock = redis.decrby("product:" + product_id, quantity_to_decrease);

            crow::json::wvalue response;
            response["product_id"] = product_id;
            response["new_stock"] = new_stock;
            return crow::response(200, response);

        } catch (const std::exception& e) {
            return crow::response(500, "{\"error\": \"Failed to update inventory\"}");
        }
    });

     // A simple endpoint to set initial stock for testing
    // POST /inventory/set
    // Body: {"productId": "some-id", "stock": 100}
    CROW_ROUTE(app, "/inventory/set").methods(crow::HTTPMethod::Post)
    ([&redis](const crow::request& req) {
        auto body = crow::json::load(req.body);
        if (!body || !body.has("productId") || !body.has("stock")) {
            return crow::response(400, "{\"error\": \"Missing productId or stock\"}");
        }
        std::string product_id = body["productId"].s();
        int stock = body["stock"].i();
        redis.set("product:" + product_id, std::to_string(stock));
        return crow::response(200, "{\"message\": \"Stock set successfully\"}");
    });


    app.port(8083)
       .multithreaded()
       .run();

    return 0;
}