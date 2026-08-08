package com.erp.management.entity;
import jakarta.persistence.*; import jakarta.validation.constraints.NotBlank;
@Entity public class Customer { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id; @NotBlank public String name; @NotBlank @Column(unique=true) public String phone; public String address; public String gstNumber; public Double totalSpent=0.0; public Double currentDebt=0.0; }
