package com.erp.management.entity;
import jakarta.persistence.*; import jakarta.validation.constraints.*; import java.time.Instant;
@Entity public class Expense { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id; @NotBlank public String title; @NotNull @DecimalMin("0.0") public Double amount; public String category; public Instant date=Instant.now(); }
