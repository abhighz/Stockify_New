package com.example.Stockify.Service;

import com.example.Stockify.Entity.Product;
import com.example.Stockify.Repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ProductService {
    @Autowired
    private ProductRepository productRepository;

    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    public Optional<Product> getProductById(String id) {
        return productRepository.findById(id);
    }

    public Optional<Product> getProductByBarcode(String barcode) {
        return productRepository.findByBarcode(barcode);
    }

    private boolean isValidCode39(String barcode) {
        return barcode != null && barcode.matches("^[A-Z0-9\\-\\. \\$\\/\\+%]*$");
    }

    public Product saveProduct(Product product) throws Exception {
        // Validate Code 39 barcode
        if (product.getBarcode() != null && !product.getBarcode().trim().isEmpty()) {
            if (!isValidCode39(product.getBarcode())) {
                throw new Exception("Barcode must be a valid Code 39 format (A-Z, 0-9, -, ., space, $, /, +, %)");
            }
            // Check if barcode already exists for a different product
            Optional<Product> existingProduct = productRepository.findByBarcode(product.getBarcode());
            if (existingProduct.isPresent() && !existingProduct.get().getId().equals(product.getId())) {
                throw new Exception("Barcode '" + product.getBarcode() + "' is already in use by another product");
            }
        }
        return productRepository.save(product);
    }

    public boolean isBarcodeExists(String barcode, String excludeProductId) {
        if (barcode == null || barcode.trim().isEmpty()) {
            return false;
        }
        Optional<Product> existingProduct = productRepository.findByBarcode(barcode);
        return existingProduct.isPresent() && !existingProduct.get().getId().equals(excludeProductId);
    }
}