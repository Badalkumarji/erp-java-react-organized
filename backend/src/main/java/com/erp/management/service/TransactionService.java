package com.erp.management.service;

import com.erp.management.entity.*;
import com.erp.management.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TransactionService {
  private final ProductRepository products; private final CustomerRepository customers;
  private final PurchaseRepository purchases; private final SaleRepository sales;
  public TransactionService(ProductRepository p, CustomerRepository c, PurchaseRepository pu, SaleRepository s) { products=p; customers=c; purchases=pu; sales=s; }

  @Transactional public Purchase createPurchase(Purchase p) {
    if(p.productId==null||p.quantity==null||p.unitPrice==null) throw new IllegalArgumentException("Product, quantity and unit price are required");
    Product product=products.findById(p.productId).orElseThrow(()->new IllegalArgumentException("Product not found"));
    if(p.quantity<1||p.unitPrice<0) throw new IllegalArgumentException("Quantity and price must be valid");
    product.quantity+=p.quantity; products.save(product); p.id=null; p.productName=p.productName==null?product.name:p.productName;
    p.totalAmount=p.quantity*p.unitPrice; p.paidAmount=p.paidAmount==null?0.0:p.paidAmount; p.dueAmount=Math.max(0,p.totalAmount-p.paidAmount); p.status=p.dueAmount>0?"Pending":"Paid";
    return purchases.save(p);
  }

  @Transactional public Sale createSale(Sale sale) {
    if(sale.items==null||sale.items.isEmpty()) throw new IllegalArgumentException("At least one item is required for a sale.");
    double taxableTotal=0, gstTotal=0, grandTotal=0;
    for(SaleItem item:sale.items) {
      if(item.productId==null||item.quantity==null||item.quantity<1) throw new IllegalArgumentException("Each sale item needs a product and quantity");
      Product product=products.findById(item.productId).orElseThrow(()->new IllegalArgumentException("Product not found: "+item.name));
      if(product.quantity<item.quantity) throw new IllegalArgumentException("Insufficient stock for: "+product.name);
      product.quantity-=item.quantity; products.save(product);
      item.name=product.name; item.priceAtSale=product.sellingPrice;
      item.taxableAmount=item.priceAtSale*item.quantity; item.gstPercent=product.gstPercent==null?0.0:product.gstPercent;
      item.gstAmount=item.taxableAmount*item.gstPercent/100.0; item.total=item.taxableAmount+item.gstAmount;
      taxableTotal+=item.taxableAmount; gstTotal+=item.gstAmount; grandTotal+=item.total;
    }
    sale.id=null; sale.invoiceNo="INV-"+System.currentTimeMillis(); sale.subTotal=taxableTotal; sale.taxAmount=gstTotal; sale.grandTotal=grandTotal;
    sale.paidAmount=sale.paidAmount==null?0.0:sale.paidAmount; sale.dueAmount=Math.max(0,sale.grandTotal-sale.paidAmount);
    if(sale.customerName!=null&&!sale.customerName.isBlank()) customers.findByName(sale.customerName).ifPresent(c->{ c.currentDebt+=sale.dueAmount; c.totalSpent+=sale.grandTotal; customers.save(c); });
    return sales.save(sale);
  }
}
