package com.erp.management.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.*;

@Entity
public class Product {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
  @NotBlank public String name;
  @NotBlank public String brand;
  public String productType="Goods";
  @NotBlank public String category;
  public String hsnSacCode;
  @NotNull @DecimalMin("0.0") public Double purchasePrice;
  @NotNull @DecimalMin("0.0") public Double sellingPrice;
  public Double gstPercent=18.0;
  @NotNull @Min(0) public Integer quantity=0;
  public String unit="pcs";
  public Integer lowStockLimit=5;
  @Column(unique=true) public String barcode;
  @ElementCollection public List<String> serialNumbers=new ArrayList<>();
  public String invoiceNumber;
  public Instant purchaseDate=Instant.now();
  public Instant createdAt=Instant.now();
  public Instant updatedAt=Instant.now();
  @PreUpdate void stamp(){updatedAt=Instant.now();}
}
