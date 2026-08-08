package com.erp.management.controller;
import com.erp.management.entity.Product; import com.erp.management.repository.ProductRepository; import jakarta.validation.Valid; import org.springframework.data.domain.Sort; import org.springframework.http.*; import org.springframework.web.bind.annotation.*; import java.util.*;
@RestController @RequestMapping("/api/inventory") public class InventoryController { private final ProductRepository products; public InventoryController(ProductRepository p){products=p;}
 @PostMapping("/add") ResponseEntity<Product> add(@Valid @RequestBody Product p){p.id=null;if(p.barcode!=null&&p.barcode.isBlank())p.barcode=null;return ResponseEntity.status(HttpStatus.CREATED).body(products.save(p));}
 @GetMapping("/all") List<Product> all(){return products.findAll(Sort.by(Sort.Direction.DESC,"createdAt"));}
 @PutMapping("/update/{id}") Product update(@PathVariable Long id,@Valid @RequestBody Product p){Product old=get(id);p.id=old.id;p.createdAt=old.createdAt;if(p.barcode!=null&&p.barcode.isBlank())p.barcode=null;return products.save(p);}
 @DeleteMapping("/delete/{id}") Map<String,String> delete(@PathVariable Long id){products.delete(get(id));return Map.of("message","Item deleted");}
 Product get(Long id){return products.findById(id).orElseThrow(()->new IllegalArgumentException("Product not found"));}
}
