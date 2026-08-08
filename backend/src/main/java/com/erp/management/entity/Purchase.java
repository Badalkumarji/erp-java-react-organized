package com.erp.management.entity;
import jakarta.persistence.*; import java.time.Instant;
@Entity public class Purchase { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id; public String vendorName; public String invoiceNo; public Long productId; public String productName; public Integer quantity; public Double unitPrice; public Double totalAmount; public Double paidAmount=0.0; public Double dueAmount=0.0; public String paymentMode="Cash"; public String status="Pending"; @Column(length=2000) public String notes; public Instant createdAt=Instant.now(); }
