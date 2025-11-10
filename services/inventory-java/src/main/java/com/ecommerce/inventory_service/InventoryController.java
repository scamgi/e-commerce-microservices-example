// src/main/java/com/ecommerce/inventoryservice/InventoryController.java
package com.ecommerce.inventoryservice;

import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/inventory")
public class InventoryController {

    private final ReactiveRedisTemplate<String, Integer> redisTemplate;

    // A simple key prefix for our Redis entries
    private static final String KEY_PREFIX = "inventory:";

    public InventoryController(ReactiveRedisTemplate<String, Integer> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    // GET /inventory/{productId} - Get stock for a product
    @GetMapping("/{productId}")
    public Mono<ResponseEntity<InventoryItem>> getStock(@PathVariable String productId) {
        return redisTemplate.opsForValue()
            .get(KEY_PREFIX + productId)
            .map(quantity -> new InventoryItem(productId, quantity))
            .map(ResponseEntity::ok) // If found, wrap in HTTP 200 OK
            .defaultIfEmpty(ResponseEntity.notFound().build()); // If not found, return HTTP 404
    }

    // POST /inventory - Set/update the stock for a product
    @PostMapping
    public Mono<InventoryItem> setStock(@RequestBody InventoryItem item) {
        return redisTemplate.opsForValue()
            .set(KEY_PREFIX + item.getProductId(), item.getQuantity())
            .thenReturn(item);
    }

    // POST /inventory/decrease - Decrease stock for a product
    @PostMapping("/decrease")
    public Mono<ResponseEntity<String>> decreaseStock(@RequestBody InventoryItem request) {
        String key = KEY_PREFIX + request.getProductId();
        return redisTemplate.opsForValue().get(key)
            .flatMap(currentStock -> {
                if (currentStock == null || currentStock < request.getQuantity()) {
                    return Mono.just(ResponseEntity.badRequest().body("Not enough stock."));
                }
                return redisTemplate.opsForValue()
                    .decrement(key, request.getQuantity())
                    .thenReturn(ResponseEntity.ok().body("Stock updated."));
            })
            .defaultIfEmpty(ResponseEntity.badRequest().body("Product not found in inventory."));
    }
}