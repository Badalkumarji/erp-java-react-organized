package com.erp.management.entity;
import jakarta.persistence.*; import jakarta.validation.constraints.NotBlank; import java.time.Instant;
@Entity @Table(name="users",uniqueConstraints={@UniqueConstraint(columnNames="phone"),@UniqueConstraint(columnNames="email")}) public class User { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id; @NotBlank public String name; public String phone; public String email; @NotBlank public String password; public String role="owner"; public Instant createdAt=Instant.now(); public Instant updatedAt=Instant.now(); }
