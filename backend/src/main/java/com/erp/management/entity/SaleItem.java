package com.erp.management.entity;

import jakarta.persistence.*;

@Embeddable
public class SaleItem {
  public Long productId;
  public String name;
  public Integer quantity;
  public Double priceAtSale;
  public Double taxableAmount;
  public Double gstPercent;
  public Double gstAmount;
  public Double total;
  public String serialNumber;
}
