// src/main/java/com/ecommerce/inventoryservice/InventoryItem.java
package com.ecommerce.inventoryservice;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class InventoryItem implements Serializable {
    private String productId;
    private Integer quantity;
}