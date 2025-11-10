// src/main/java/com/ecommerce/inventoryservice/RedisConfig.java
package com.ecommerce.inventoryservice;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.ReactiveRedisConnectionFactory;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class RedisConfig {

    @Bean
    public ReactiveRedisTemplate<String, Integer> reactiveRedisTemplate(ReactiveRedisConnectionFactory factory) {
        // Serializer for the keys (product IDs), which are Strings
        StringRedisSerializer keySerializer = new StringRedisSerializer();

        // Serializer for the values (quantities), which are Integers.
        // Jackson2JsonRedisSerializer is a good choice as it can handle complex objects too.
        Jackson2JsonRedisSerializer<Integer> valueSerializer = new Jackson2JsonRedisSerializer<>(Integer.class);

        // Build the serialization context
        RedisSerializationContext.RedisSerializationContextBuilder<String, Integer> builder =
                RedisSerializationContext.newSerializationContext(keySerializer);

        RedisSerializationContext<String, Integer> context = builder.value(valueSerializer).build();

        // Create and return the template with the factory and the serialization context
        return new ReactiveRedisTemplate<>(factory, context);
    }
}