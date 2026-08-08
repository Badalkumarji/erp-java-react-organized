import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import { PackagePlus, RefreshCw } from 'lucide-react';
import { formatInr } from './utils/currency';
import './App.css';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });

const defaultProduct = {
  name: '',
  brand: '',
  productType: 'Goods',
  category: 'Powerloom Part',
  hsnSacCode: '',
  gstPercent: '18',
  purchasePrice: '',
  sellingPrice: '',
  quantity: '',
  unit: 'pcs',
  lowStockLimit: ''
};

const defaultPerson = { name: '', phone: '', address: '' };
const defaultExpense = { title: '', amount: '', category: 'Utility' };

const receiptCompanyInfo = {
  name: 'Geeta Traders',
  address: 'Manpur Patwatoli near Durga Asthan, Gaya, Bihar, India',
  phone: '+91 8102003847',
  email: 'kumar.badalpatwa11158@gmail.com',
  website: 'www.geetatraders.com',
  footerNote: 'Thank you for your business! Please keep this receipt for your records.'
};

function App() {
  const [view, setView] = useState('dashboard');
  const [products, setProducts] = useState([]);
  const [people, setPeople] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [productForm, setProductForm] = useState(defaultProduct);
  const [personForm, setPersonForm] = useState(defaultPerson);
  const [expenseForm, setExpenseForm] = useState(defaultExpense);
  const [saleInvoiceNo, setSaleInvoiceNo] = useState(`INV-${Date.now()}`);
  const [saleCustomer, setSaleCustomer] = useState('');
  const [salePaymentMode, setSalePaymentMode] = useState('Cash');
  const [salePaidAmount, setSalePaidAmount] = useState('');
  const [saleItems, setSaleItems] = useState([]);
  const [selectedSaleProductId, setSelectedSaleProductId] = useState('');
  const [saleQuantity, setSaleQuantity] = useState('1');
  const [editProductId, setEditProductId] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const [peopleSearch, setPeopleSearch] = useState('');
  const [salesReportSearch, setSalesReportSearch] = useState('');
  const [salesReportSortBy, setSalesReportSortBy] = useState('date');
  const [salesReportSortDirection, setSalesReportSortDirection] = useState('desc');
  const [vendorForm, setVendorForm] = useState({ name: '', phone: '', address: '', gstNo: '' });
  const [vendors, setVendors] = useState([]);
  const [purchaseForm, setPurchaseForm] = useState({ vendorName: '', invoiceNo: '', productId: '', productName: '', quantity: '', unitPrice: '', paidAmount: '', paymentMode: 'Cash', notes: '' });
  const [showInventoryList, setShowInventoryList] = useState(false);
  const [showPeopleList, setShowPeopleList] = useState(false);
  const [showExpensesList, setShowExpensesList] = useState(false);
  const [showSalesList, setShowSalesList] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [productsRes, peopleRes, expensesRes, salesRes, purchasesRes] = await Promise.all([
        api.get('/inventory/all'),
        api.get('/people/all'),
        api.get('/expenses/all'),
        api.get('/sales/history'),
        api.get('/purchases/history')
      ]);
      setProducts(productsRes.data || []);
      setPeople(peopleRes.data || []);
      setExpenses(expensesRes.data || []);
      setSales(salesRes.data || []);
      setPurchases(purchasesRes.data || []);
    } catch (err) {
      console.error('API load failed:', err);
      const backendMessage = err?.response?.data?.message || err.message || 'Unable to load data from backend.';
      setMessage(`Unable to load data from backend: ${backendMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const resetMessage = () => setMessage('');

  const handleProductSubmit = async (event) => {
    event.preventDefault();
    resetMessage();

    try {
      const payload = {
        ...productForm,
        purchasePrice: Number(productForm.purchasePrice),
        sellingPrice: Number(productForm.sellingPrice),
        gstPercent: Number(productForm.gstPercent),
        quantity: Number(productForm.quantity),
        lowStockLimit: Number(productForm.lowStockLimit)
      };

      if (editProductId) {
        await api.put(`/inventory/update/${editProductId}`, payload);
        setMessage('Product updated successfully.');
      } else {
        await api.post('/inventory/add', payload);
        setMessage('Product added successfully.');
      }

      setProductForm(defaultProduct);
      setEditProductId(null);
      await fetchAll();
      setShowInventoryList(true);
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Failed to save product.');
    }
  };

  const handleEditProduct = (product) => {
    setEditProductId(product.id);
    setProductForm({
      name: product.name || '',
      brand: product.brand || '',
      productType: product.productType || 'Goods',
      category: product.category || 'Powerloom Part',
      hsnSacCode: product.hsnSacCode || '',
      gstPercent: product.gstPercent ?? '18',
      purchasePrice: product.purchasePrice || '',
      sellingPrice: product.sellingPrice || '',
      quantity: product.quantity || '',
      unit: product.unit || 'pcs',
      lowStockLimit: product.lowStockLimit || ''
    });
    setMessage('Editing product. Make your changes and save.');
  };

  const cancelEditProduct = () => {
    setEditProductId(null);
    setProductForm(defaultProduct);
    resetMessage();
  };

  const handlePersonSubmit = async (event) => {
    event.preventDefault();
    resetMessage();

    try {
      await api.post('/people/add', personForm);
      setPersonForm(defaultPerson);
      await fetchAll();
      setShowPeopleList(true);
      setMessage('Customer added successfully.');
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Failed to add customer.');
    }
  };

  const handleExpenseSubmit = async (event) => {
    event.preventDefault();
    resetMessage();

    try {
      await api.post('/expenses/add', {
        ...expenseForm,
        amount: Number(expenseForm.amount)
      });
      setExpenseForm(defaultExpense);
      await fetchAll();
      setShowExpensesList(true);
      setMessage('Expense recorded successfully.');
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Failed to record expense.');
    }
  };

  const addSaleItem = () => {
    resetMessage();

    if (!selectedSaleProductId) {
      setMessage('Select a product first.');
      return;
    }

    const product = products.find((p) => p.id === selectedSaleProductId);
    if (!product) {
      setMessage('Selected product was not found.');
      return;
    }

    const quantity = Number(saleQuantity);
    if (!Number.isFinite(quantity) || quantity < 1) {
      setMessage('Enter a valid quantity greater than 0.');
      return;
    }

    const taxableAmount = quantity * Number(product.sellingPrice);
    const gstPercent = Number(product.gstPercent || 0);
    const gstAmount = taxableAmount * gstPercent / 100;
    const item = {
      productId: product.id,
      product: product.id,
      name: product.name,
      quantity,
      priceAtSale: product.sellingPrice,
      taxableAmount,
      gstPercent,
      gstAmount,
      total: taxableAmount + gstAmount
    };

    setSaleItems((current) => [...current, item]);
    setSaleQuantity('');
    setMessage(`Added ${quantity} ÃƒÆ’Ã¢â‚¬â€ ${product.name}.`);
  };

  const removeSaleItem = (index) => {
    setSaleItems((items) => items.filter((_, idx) => idx !== index));
  };

  const saleSubTotal = useMemo(
    () => saleItems.reduce((total, item) => total + Number(item.total || 0), 0),
    [saleItems]
  );

  const saleTaxableAmount = useMemo(
    () => saleItems.reduce((total, item) => total + Number(item.taxableAmount || 0), 0),
    [saleItems]
  );
  const saleGstAmount = useMemo(
    () => saleItems.reduce((total, item) => total + Number(item.gstAmount || 0), 0),
    [saleItems]
  );

  const salePaid = Number(salePaidAmount || 0);
  const saleDue = Math.max(0, saleSubTotal - salePaid);

  const handleSaleSubmit = async (event) => {
    event.preventDefault();
    resetMessage();

    const currentSaleItems = saleItems;
    const currentSaleSubtotal = currentSaleItems.reduce((total, item) => total + Number(item.total || 0), 0);
    const currentSalePaid = Number(salePaidAmount || 0);

    if (!currentSaleItems.length) {
      setMessage('Add at least one product to create a sale.');
      return;
    }

    try {
      const salePayload = {
        invoiceNo: saleInvoiceNo || `INV-${Date.now()}`,
        items: currentSaleItems.map((item) => ({
          productId: item.productId,
          product: item.product,
          name: item.name,
          quantity: Number(item.quantity),
          priceAtSale: Number(item.priceAtSale),
          taxableAmount: Number(item.taxableAmount),
          gstPercent: Number(item.gstPercent),
          gstAmount: Number(item.gstAmount),
          total: Number(item.total)
        })),
        customerName: saleCustomer,
        paymentMode: salePaymentMode,
        paidAmount: currentSalePaid,
        subTotal: saleTaxableAmount,
        taxAmount: saleGstAmount,
        grandTotal: currentSaleSubtotal
      };

      const response = await api.post('/sales/create', salePayload);
      setSaleCustomer('');
      setSalePaidAmount('');
      setSalePaymentMode('Cash');
      setSaleItems([]);
      setSaleInvoiceNo(`INV-${Date.now()}`);
      await fetchAll();
      setShowSalesList(true);
      setMessage(`Sale completed successfully. Invoice ${response?.data?.invoice?.invoiceNo || salePayload.invoiceNo} has been saved. Total: ${formatCurrency(currentSaleSubtotal)}`);
    } catch (err) {
      const backendMessage = err?.response?.data?.message || 'Failed to create sale.';
      setMessage(backendMessage);
    }
  };
  const formatCurrency = formatInr;
  const printReceipt = (receipt) => {
    if (!receipt) return;
    const receiptWindow = window.open('', '_blank');
    const receiptHtml = `
      <html>
        <head>
          <title>Receipt - ${receipt.invoiceNo}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #172b4d; }
            h1 { margin-bottom: 8px; }
            .receipt-header, .receipt-details, .receipt-items { margin-bottom: 18px; }
            .receipt-items table { width: 100%; border-collapse: collapse; }
            .receipt-items th, .receipt-items td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            .receipt-footer { margin-top: 16px; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="receipt-branding">
            <div class="receipt-logo">BADAL</div>
            <div>
              <h1>Badal ERP & Traders</h1>
              <p>${receiptCompanyInfo.address}</p>
              <p>Phone: ${receiptCompanyInfo.phone} | Email: ${receiptCompanyInfo.email}</p>
              <p>Web: ${receiptCompanyInfo.website}</p>
            </div>
          </div>
          <div class="receipt-header">
            <p><strong>Invoice:</strong> ${receipt.invoiceNo}</p>
            <p><strong>Date:</strong> ${receipt.date.toLocaleString()}</p>
          </div>
          <div class="receipt-details">
            <p><strong>Customer:</strong> ${receipt.customerName}</p>
            <p><strong>Payment Mode:</strong> ${receipt.paymentMode}</p>
          </div>
          <div class="receipt-items">
            <table>
              <thead>
                <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
              </thead>
              <tbody>
                ${receipt.items.map((item) => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>${formatCurrency(item.price)}</td>
                    <td>${formatCurrency(item.total)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="receipt-footer">
            <p>Subtotal: ${formatCurrency(receipt.total)}</p>
            <p>Paid: ${formatCurrency(receipt.paidAmount)}</p>
            <p>Due: ${formatCurrency(receipt.due)}</p>
          </div>
        </body>
      </html>
    `;
    receiptWindow.document.write(receiptHtml);
    receiptWindow.document.close();
    receiptWindow.focus();
    receiptWindow.print();
  };

  const downloadReceiptPdf = (receipt) => {
    if (!receipt) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const lineHeight = 20;
    let y = 40;

    doc.setFillColor(37, 99, 235);
    doc.rect(40, 24, 120, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('BADAL', 46, 46);
    doc.setTextColor(17, 35, 77);
    y += lineHeight * 2;

    doc.setFontSize(12);
    doc.text(receiptCompanyInfo.name, 40, y);
    doc.setFontSize(10);
    doc.text(receiptCompanyInfo.address, 40, y + 16);
    doc.text(`Phone: ${receiptCompanyInfo.phone}`, 40, y + 32);
    doc.text(`Email: ${receiptCompanyInfo.email}`, 40, y + 48);
    doc.text(`Website: ${receiptCompanyInfo.website}`, 40, y + 64);
    y += lineHeight * 5;
    doc.setFontSize(12);
    doc.text(`Invoice: ${receipt.invoiceNo}`, 40, y);
    y += lineHeight;
    doc.text(`Date: ${receipt.date.toLocaleString()}`, 40, y);
    y += lineHeight;
    doc.text(`Customer: ${receipt.customerName}`, 40, y);
    y += lineHeight;
    doc.text(`Payment Mode: ${receipt.paymentMode}`, 40, y);
    y += lineHeight * 1.5;

    doc.setFontSize(13);
    doc.text('Items', 40, y);
    y += lineHeight;
    doc.setFontSize(11);
    doc.text('Item', 40, y);
    doc.text('Qty', 260, y);
    doc.text('Price', 330, y);
    doc.text('Total', 430, y);
    y += lineHeight;

    receipt.items.forEach((item) => {
      doc.text(item.name, 40, y);
      doc.text(String(item.quantity), 260, y);
      doc.text(formatCurrency(item.price), 330, y);
      doc.text(formatCurrency(item.total), 430, y);
      y += lineHeight;
      if (y > 720) {
        doc.addPage();
        y = 40;
      }
    });

    y += lineHeight;
    doc.text(`Subtotal: ${formatCurrency(receipt.total)}`, 40, y);
    y += lineHeight;
    doc.text(`Paid: ${formatCurrency(receipt.paidAmount)}`, 40, y);
    y += lineHeight;
    doc.text(`Due: ${formatCurrency(receipt.due)}`, 40, y);
    y += lineHeight * 2;
    doc.setFontSize(10);
    doc.text(receiptCompanyInfo.footerNote, 40, y);
    doc.save(`receipt-${receipt.invoiceNo}.pdf`);
  };

  const showSaleReceipt = (sale) => {
    if (!sale) return;
    setReceiptData({
      invoiceNo: sale.invoiceNo || `INV-${Date.now()}`,
      date: sale.createdAt ? new Date(sale.createdAt) : new Date(),
      customerName: sale.customerName || 'Walk-in',
      paymentMode: sale.paymentMode || 'Cash',
      paidAmount: Number(sale.paidAmount || 0),
      total: Number(sale.totalAmount || sale.grandTotal || 0),
      due: Number(sale.dueAmount || 0),
      items: Array.isArray(sale.items)
        ? sale.items.map((item) => ({
            name: item.name || item.product || 'Item',
            quantity: item.quantity || 1,
            price: item.priceAtSale || item.price || 0,
            total: item.total || Number(item.quantity || 1) * Number(item.priceAtSale || item.price || 0)
          }))
        : []
    });
    setShowSalesList(true);
  };

  const deleteProduct = async (id) => {
    resetMessage();
    try {
      await api.delete(`/inventory/delete/${id}`);
      if (editProductId === id) cancelEditProduct();
      await fetchAll();
      setMessage('Product deleted successfully.');
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Failed to delete product.');
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.brand.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredPeople = people.filter((person) =>
    person.name.toLowerCase().includes(peopleSearch.toLowerCase()) ||
    person.phone.toLowerCase().includes(peopleSearch.toLowerCase()) ||
    (person.address || '').toLowerCase().includes(peopleSearch.toLowerCase())
  );

  const totalRevenue = sales.reduce(
    (total, sale) => total + Number(sale.totalAmount ?? sale.grandTotal ?? 0),
    0
  );
  const totalExpenses = expenses.reduce((total, expense) => total + Number(expense.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const outstandingDues = sales.reduce((total, sale) => total + Number(sale.dueAmount || 0), 0);
  const totalStockValue = products.reduce(
    (total, product) => total + Number(product.quantity || 0) * Number(product.purchasePrice || 0),
    0
  );
  const totalStockUnits = products.reduce((total, product) => total + Number(product.quantity || 0), 0);
  const lowStockProducts = products.filter(
    (product) => product.lowStockLimit && product.quantity <= product.lowStockLimit
  );

  const monthlyPerformance = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));
      return {
        label: date.toLocaleString('en', { month: 'short' }),
        revenue: 0,
        expense: 0
      };
    });

    sales.forEach((sale) => {
      const saleDate = sale.createdAt ? new Date(sale.createdAt) : new Date();
      const index = months.findIndex(
        (month) => month.label === saleDate.toLocaleString('en', { month: 'short' })
      );
      if (index >= 0) {
        months[index].revenue += Number(sale.totalAmount ?? sale.grandTotal ?? 0);
      }
    });

    expenses.forEach((expense) => {
      const expenseDate = expense.createdAt ? new Date(expense.createdAt) : new Date();
      const index = months.findIndex(
        (month) => month.label === expenseDate.toLocaleString('en', { month: 'short' })
      );
      if (index >= 0) {
        months[index].expense += Number(expense.amount || 0);
      }
    });

    const maxValue = Math.max(...months.map((month) => Math.max(month.revenue, month.expense, 1)));
    return months.map((month) => ({
      ...month,
      revenueHeight: Math.max(8, (month.revenue / maxValue) * 100),
      expenseHeight: Math.max(8, (month.expense / maxValue) * 100)
    }));
  }, [sales, expenses]);

  const ledgerEntries = useMemo(() => {
    const salesEntries = sales.map((sale) => ({
      id: sale.id,
      type: 'Sales',
      title: sale.customerName || 'Walk-in',
      amount: Number(sale.totalAmount ?? sale.grandTotal ?? 0),
      date: sale.createdAt || new Date().toISOString()
    }));

    const expenseEntries = expenses.map((expense) => ({
      id: expense.id,
      type: 'Expense',
      title: expense.title || 'Expense',
      amount: -Number(expense.amount || 0),
      date: expense.createdAt || new Date().toISOString()
    }));

    return [...salesEntries, ...expenseEntries]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8);
  }, [sales, expenses]);

  const salesReportRows = useMemo(() => {
    const rows = sales.map((sale) => ({
      invoiceNo: sale.invoiceNo || 'N/A',
      customerName: sale.customerName || 'Walk-in',
      total: Number(sale.totalAmount ?? sale.grandTotal ?? 0),
      paid: Number(sale.paidAmount || 0),
      due: Number(sale.dueAmount || 0),
      date: sale.createdAt ? new Date(sale.createdAt).toLocaleDateString() : 'N/A'
    }));

    const query = salesReportSearch.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) =>
      row.invoiceNo.toLowerCase().includes(query) ||
      row.customerName.toLowerCase().includes(query) ||
      row.date.toLowerCase().includes(query)
    );
  }, [sales, salesReportSearch]);

  const salesReportTotals = useMemo(() => ({
    count: salesReportRows.length,
    total: salesReportRows.reduce((sum, row) => sum + row.total, 0),
    paid: salesReportRows.reduce((sum, row) => sum + row.paid, 0),
    due: salesReportRows.reduce((sum, row) => sum + row.due, 0)
  }), [salesReportRows]);

  const sortedSalesReportRows = useMemo(() => {
    const rows = [...salesReportRows];
    const direction = salesReportSortDirection === 'asc' ? 1 : -1;

    const compareValue = (value) => {
      if (typeof value === 'number') return value;
      if (!value) return '';
      const date = new Date(value);
      return !Number.isNaN(date.valueOf()) ? date.valueOf() : String(value).toLowerCase();
    };

    return rows.sort((a, b) => {
      const valueA = compareValue(a[salesReportSortBy]);
      const valueB = compareValue(b[salesReportSortBy]);

      if (valueA < valueB) return -1 * direction;
      if (valueA > valueB) return 1 * direction;
      return 0;
    });
  }, [salesReportRows, salesReportSortBy, salesReportSortDirection]);

  const handleSalesReportSort = (field) => {
    if (salesReportSortBy === field) {
      setSalesReportSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSalesReportSortBy(field);
      setSalesReportSortDirection('asc');
    }
  };

  const exportReport = (reportName, rows) => {
    const csvRows = [
      Object.keys(rows[0] || {}).join(','),
      ...rows.map((row) => Object.values(row).join(','))
    ];
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportName}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdfReport = (reportName, rows) => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(reportName, 14, 16);
    let y = 28;
    rows.forEach((row) => {
      doc.setFontSize(10);
      doc.text(`${row.invoiceNo || row.customerName || row.type || row.title || row.name || 'Record'} | ${JSON.stringify(row)}`, 14, y);
      y += 8;
    });
    doc.save(`${reportName}.pdf`);
  };

  const handleVendorSubmit = (event) => {
    event.preventDefault();
    const newVendor = { ...vendorForm, id: `${Date.now()}` };
    setVendors((current) => [newVendor, ...current]);
    setVendorForm({ name: '', phone: '', address: '', gstNo: '' });
    setMessage('Vendor added successfully.');
  };

  const handlePurchaseSubmit = async (event) => {
    event.preventDefault();
    resetMessage();

    try {
      const payload = {
        ...purchaseForm,
        quantity: Number(purchaseForm.quantity),
        unitPrice: Number(purchaseForm.unitPrice),
        paidAmount: Number(purchaseForm.paidAmount || 0)
      };

      const selectedProduct = products.find((product) => product.id === purchaseForm.productId);
      if (selectedProduct) {
        payload.productName = selectedProduct.name;
      }

      await api.post('/purchases/create', payload);
      setPurchaseForm({ vendorName: '', invoiceNo: '', productId: '', productName: '', quantity: '', unitPrice: '', paidAmount: '', paymentMode: 'Cash', notes: '' });
      await fetchAll();
      setMessage('Purchase recorded successfully.');
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Failed to record purchase.');
    }
  };

  const paymentSummary = useMemo(() => {
    const totalPayables = purchases.reduce((sum, purchase) => sum + Number(purchase.dueAmount || 0), 0);
    const totalReceivables = sales.reduce((sum, sale) => sum + Number(sale.dueAmount || 0), 0);
    return { totalPayables, totalReceivables };
  }, [purchases, sales]);

  const profitMargin = useMemo(() => {
    if (totalRevenue === 0) return 0;
    return ((totalRevenue - totalExpenses) / totalRevenue) * 100;
  }, [totalRevenue, totalExpenses]);

  const ledgerTotals = useMemo(() => ({
    customerDebt: paymentSummary.totalReceivables,
    supplierPayables: paymentSummary.totalPayables,
    peopleCount: people.length,
    expenseCount: expenses.length
  }), [paymentSummary, people.length, expenses.length]);

  const taxRate = 0.18;
  const taxSummary = useMemo(() => {
    const taxableSales = totalRevenue * taxRate;
    const taxableExpenses = totalExpenses * taxRate;
    const outputGST = taxableSales * 1;
    const inputGST = taxableExpenses * 1;
    const netTax = outputGST - inputGST;
    return {
      taxableSales,
      taxableExpenses,
      outputGST,
      inputGST,
      netTax,
      taxRate
    };
  }, [totalRevenue, totalExpenses]);

  const comparisonData = useMemo(() => {
    const data = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));
      const label = date.toLocaleString('en', { month: 'short' });
      const salesValue = sales
        .filter((sale) => new Date(sale.createdAt || new Date()).toLocaleString('en', { month: 'short' }) === label)
        .reduce((sum, sale) => sum + Number(sale.totalAmount ?? sale.grandTotal ?? 0), 0);
      const expenseValue = expenses
        .filter((expense) => new Date(expense.createdAt || new Date()).toLocaleString('en', { month: 'short' }) === label)
        .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
      return { label, salesValue, expenseValue };
    });
    const maxValue = Math.max(...data.map((item) => Math.max(item.salesValue, item.expenseValue, 1)));
    return data.map((item) => ({
      ...item,
      salesHeight: Math.max(8, (item.salesValue / maxValue) * 100),
      expenseHeight: Math.max(8, (item.expenseValue / maxValue) * 100),
      variance: item.salesValue - item.expenseValue,
      margin: item.salesValue ? ((item.salesValue - item.expenseValue) / item.salesValue) * 100 : 0
    }));
  }, [sales, expenses]);

  const comparisonSummary = useMemo(() => {
    const salesTotal = comparisonData.reduce((sum, item) => sum + item.salesValue, 0);
    const expenseTotal = comparisonData.reduce((sum, item) => sum + item.expenseValue, 0);
    const bestMonth = comparisonData.reduce((best, item) => (item.salesValue > best.salesValue ? item : best), comparisonData[0] || { label: '', salesValue: 0 });
    const worstMonth = comparisonData.reduce((worst, item) => (item.variance < worst.variance ? item : worst), comparisonData[0] || { label: '', variance: 0 });
    return {
      averageSales: salesTotal / Math.max(comparisonData.length, 1),
      averageExpenses: expenseTotal / Math.max(comparisonData.length, 1),
      salesTotal,
      expenseTotal,
      bestMonth,
      worstMonth
    };
  }, [comparisonData]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>Badal ERP</h1>
        <nav>
          {['dashboard', 'inventory', 'sales', 'purchases', 'people', 'expenses', 'accounts', 'sales-report', 'ledger', 'profit-loss', 'vendors', 'tax-summary', 'monthly-comparison'].map((item) => (
            <button
              key={item}
              className={view === item ? 'active' : ''}
              onClick={() => setView(item)}
            >
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <h2>{view.charAt(0).toUpperCase() + view.slice(1)}</h2>

          </div>
          {message && <div className="notice">{message}</div>}
        </header>

        <section className="content">
          {view === 'dashboard' && (
            <>
              <div className="cards">
                <div className="card">
                  <span>{products.length}</span>
                  <p>Products</p>
                </div>
                <div className="card">
                  <span>{people.length}</span>
                  <p>Customers</p>
                </div>
                <div className="card">
                  <span>{formatCurrency(totalRevenue.toFixed(2))}</span>
                  <p>Revenue</p>
                </div>
                <div className="card">
                  <span>{formatCurrency(netProfit.toFixed(2))}</span>
                  <p>Net Profit</p>
                </div>
                <div className="card">
                  <span>{formatCurrency(outstandingDues.toFixed(2))}</span>
                  <p>Outstanding Dues</p>
                </div>
                <div className="card">
                  <span>{formatCurrency(totalStockValue.toFixed(2))}</span>
                  <p>Stock Value</p>
                </div>
                <div className="card">
                  <span>{formatCurrency(paymentSummary.totalReceivables.toFixed(2))}</span>
                  <p>Receivables</p>
                </div>
                <div className="card">
                  <span>{formatCurrency(paymentSummary.totalPayables.toFixed(2))}</span>
                  <p>Payables</p>
                </div>
              </div>

              <section className="dashboard-command-center" aria-label="Quick business actions">
                <div className="dashboard-welcome">
                  <span className="eyebrow">Business pulse</span>
                  <h3>{netProfit >= 0 ? 'Your business is moving in the right direction.' : 'Expenses currently exceed sales.'}</h3>
                  <p>
                    {totalRevenue > 0
                      ? `Profit margin: ${profitMargin.toFixed(1)}% â€¢ ${lowStockProducts.length} item${lowStockProducts.length === 1 ? '' : 's'} need attention`
                      : 'Start by adding products, then create your first sale to see live insights here.'}
                  </p>
                </div>
                <div className="quick-actions">
                  <button type="button" className="quick-action quick-action-primary" onClick={() => setView('sales')}><span>+</span> New sale</button>
                  <button type="button" className="quick-action" onClick={() => setView('inventory')}>
                    <PackagePlus className="quick-action-icon" size={17} strokeWidth={2.5} aria-hidden="true" />
                    Add stock
                  </button>
                  <button type="button" className="quick-action" onClick={() => setView('expenses')}><span>{'\u20B9'}</span> Add expense</button>
                  <button type="button" className="quick-action" onClick={fetchAll} disabled={loading}>
                    <RefreshCw className={`quick-action-icon${loading ? ' is-spinning' : ''}`} size={17} strokeWidth={2.5} aria-hidden="true" />
                    {loading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
              </section>

              <section className="mini-insights" aria-label="Business insights">
                <div className="insight insight-stock"><span>Stock units</span><strong>{totalStockUnits}</strong><small>Across {products.length} products</small></div>
                <div className="insight insight-dues"><span>Customer dues</span><strong>{formatCurrency(outstandingDues.toFixed(2))}</strong><small>Collect from sales invoices</small></div>
                <div className="insight insight-profit"><span>Profit margin</span><strong>{profitMargin.toFixed(1)}%</strong><small>Revenue less recorded expenses</small></div>
              </section>

              <div className="dashboard-grid">
                <div className="panel-table">
                  <h3>Monthly Performance</h3>
                  <div className="chart-legend">
                    <span className="legend-item revenue">Revenue</span>
                    <span className="legend-item expense">Expense</span>
                  </div>
                  <div className="chart">
                    {monthlyPerformance.map((month) => (
                      <div key={month.label} className="chart-column">
                        <div className="chart-bars">
                          <div className="bar revenue" style={{ height: `${month.revenueHeight}%` }} />
                          <div className="bar expense" style={{ height: `${month.expenseHeight}%` }} />
                        </div>
                        <span>{month.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel-table">
                  <h3>Tally-Style Summary</h3>
                  <div className="summary-grid">
                    <div className="summary-card">
                      <strong>{formatCurrency(totalRevenue.toFixed(2))}</strong>
                      <span>Sales</span>
                    </div>
                    <div className="summary-card">
                      <strong>{formatCurrency(totalExpenses.toFixed(2))}</strong>
                      <span>Expenses</span>
                    </div>
                    <div className="summary-card">
                      <strong>{formatCurrency(netProfit.toFixed(2))}</strong>
                      <span>Net Profit</span>
                    </div>
                    <div className="summary-card">
                      <strong>{lowStockProducts.length}</strong>
                      <span>Low Stock Items</span>
                    </div>
                  </div>
                  <div className="summary-list">
                    <h4>Low Stock Alerts</h4>
                    {lowStockProducts.length ? (
                      lowStockProducts.map((product) => (
                        <div key={product.id} className="summary-list-item">
                          <span>{product.name}</span>
                          <strong>{product.quantity} left</strong>
                        </div>
                      ))
                    ) : (
                      <p className="empty-state">All stock levels are healthy.</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {view === 'inventory' && (
            <div className="panel-grid">
              <form className="panel-form" onSubmit={handleProductSubmit}>
                <h3>{editProductId ? 'Edit Product' : 'Add Product'}</h3>
                <label>
                  Search Products
                  <input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search by name, brand, category"
                  />
                </label>
                <label>
                  Name
                  <input
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Brand
                  <input
                    value={productForm.brand}
                    onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Type
                  <select
                    value={productForm.productType}
                    onChange={(e) => setProductForm({ ...productForm, productType: e.target.value })}
                  >
                    <option value="Goods">Goods</option>
                    <option value="Services">Services</option>
                  </select>
                </label>
                <label>
                  Category
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  >
                    <option>Powerloom Part</option>
                    <option>Electronic</option>
                    <option>General</option>
                    <option>Permanent Asset</option>
                    <option>Service</option>
                  </select>
                </label>
                <label>
                  HSN / SAC Code
                  <input
                    value={productForm.hsnSacCode}
                    onChange={(e) => setProductForm({ ...productForm, hsnSacCode: e.target.value })}
                    placeholder={productForm.productType === 'Services' ? 'SAC code, e.g. 9983' : 'HSN code'}
                  />
                </label>
                <label>
                  GST Rate
                  <select
                    value={productForm.gstPercent}
                    onChange={(e) => setProductForm({ ...productForm, gstPercent: e.target.value })}
                  >
                    <option value="0">0% (Exempt)</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </label>
                <label>
                  Purchase Price
                  <input
                    type="number"
                    value={productForm.purchasePrice}
                    onChange={(e) => setProductForm({ ...productForm, purchasePrice: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Selling Price
                  <input
                    type="number"
                    value={productForm.sellingPrice}
                    onChange={(e) => setProductForm({ ...productForm, sellingPrice: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Quantity
                  <input
                    type="number"
                    value={productForm.quantity}
                    onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Unit
                  <input
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                  />
                </label>
                <label>
                  Low Stock Alert
                  <input
                    type="number"
                    value={productForm.lowStockLimit}
                    onChange={(e) => setProductForm({ ...productForm, lowStockLimit: e.target.value })}
                  />
                </label>
                <div className="form-actions">
                  <button type="submit">Save Product</button>
                  {editProductId && (
                    <button type="button" className="secondary" onClick={cancelEditProduct}>
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setShowInventoryList((prev) => !prev)}
                  >
                    {showInventoryList ? 'Hide List' : 'Show List'}
                  </button>
                </div>
              </form>

              {showInventoryList ? (
                <div className="panel-table">
                  <h3>Product List</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Brand</th>
                        <th>Category</th>
                        <th>Qty</th>
                        <th>Sale Price</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => {
                        const lowStock = product.lowStockLimit && product.quantity <= product.lowStockLimit;
                        return (
                          <tr key={product.id} className={lowStock ? 'low-stock-row' : ''}>
                            <td>{product.name}</td>
                            <td>{product.brand}</td>
                            <td>{product.category}</td>
                            <td>{product.quantity}</td>
                            <td>{product.sellingPrice}</td>
                            <td>{lowStock ? 'Low stock' : 'OK'}</td>
                            <td>
                              <button type="button" onClick={() => handleEditProduct(product)}>
                                Edit
                              </button>
                              <button className="danger" onClick={() => deleteProduct(product.id)}>
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {!filteredProducts.length && (
                        <tr>
                          <td colSpan="7">No products available yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="panel-table">
                  <button type="button" className="secondary" onClick={() => setShowInventoryList(true)}>
                    Show Inventory List
                  </button>
                </div>
              )}
            </div>
          )}

          {view === 'purchases' && (
            <div className="panel-grid">
              <form className="panel-form" onSubmit={handlePurchaseSubmit}>
                <h3>Record Purchase</h3>
                <label>
                  Vendor Name
                  <input value={purchaseForm.vendorName} onChange={(e) => setPurchaseForm({ ...purchaseForm, vendorName: e.target.value })} required />
                </label>
                <label>
                  Invoice Number
                  <input value={purchaseForm.invoiceNo} onChange={(e) => setPurchaseForm({ ...purchaseForm, invoiceNo: e.target.value })} required />
                </label>
                <label>
                  Product
                  <select value={purchaseForm.productId} onChange={(e) => setPurchaseForm({ ...purchaseForm, productId: e.target.value })} required>
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Quantity
                  <input type="number" value={purchaseForm.quantity} onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })} required />
                </label>
                <label>
                  Unit Price
                  <input type="number" value={purchaseForm.unitPrice} onChange={(e) => setPurchaseForm({ ...purchaseForm, unitPrice: e.target.value })} required />
                </label>
                <label>
                  Paid Amount
                  <input type="number" value={purchaseForm.paidAmount} onChange={(e) => setPurchaseForm({ ...purchaseForm, paidAmount: e.target.value })} />
                </label>
                <label>
                  Payment Mode
                  <select value={purchaseForm.paymentMode} onChange={(e) => setPurchaseForm({ ...purchaseForm, paymentMode: e.target.value })}>
                    <option>Cash</option>
                    <option>UPI</option>
                    <option>Card</option>
                    <option>Credit</option>
                  </select>
                </label>
                <label>
                  Notes
                  <input value={purchaseForm.notes} onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })} />
                </label>
                <button type="submit">Save Purchase</button>
              </form>

              <div className="panel-table">
                <h3>Purchase History</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Vendor</th>
                      <th>Invoice</th>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Due</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((purchase) => (
                      <tr key={purchase.id}>
                        <td>{purchase.vendorName}</td>
                        <td>{purchase.invoiceNo}</td>
                        <td>{purchase.productName}</td>
                        <td>{purchase.quantity}</td>
                        <td>{formatCurrency(Number(purchase.dueAmount || 0).toFixed(2))}</td>
                        <td>{purchase.status}</td>
                      </tr>
                    ))}
                    {!purchases.length && (
                      <tr>
                        <td colSpan="6">No purchases recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'sales' && (
            <div className="panel-grid">
              <form className="panel-form" onSubmit={handleSaleSubmit}>
                <h3>Create Sale</h3>
                <label>
                  Invoice / Receipt Number
                  <input
                    value={saleInvoiceNo}
                    onChange={(e) => setSaleInvoiceNo(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Customer Name
                  <input
                    value={saleCustomer}
                    onChange={(e) => setSaleCustomer(e.target.value)}
                  />
                </label>
                <label>
                  Product
                  <select
                    value={selectedSaleProductId}
                    onChange={(e) => {
                      setSelectedSaleProductId(e.target.value);
                      setSaleQuantity('1');
                    }}
                  >
                    <option value="">Pick one</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â {formatCurrency(product.sellingPrice)} ({product.quantity} in stock)
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Quantity
                  <input
                    type="number"
                    min="1"
                    value={saleQuantity}
                    onChange={(e) => setSaleQuantity(e.target.value)}
                  />
                </label>
                <button type="button" onClick={addSaleItem}>
                  Add Item
                </button>

                <div className="sale-items">
                  {saleItems.length ? (
                    saleItems.map((item, index) => (
                      <div key={`${item.productId}-${index}`} className="sale-item">
                        <div>
                          <strong>{item.name}</strong>
                          <span>{item.quantity} ÃƒÆ’Ã¢â‚¬â€ {formatCurrency(item.priceAtSale)}</span>
                        </div>
                        <div>
                          <span>{formatCurrency(item.total)}</span>
                          <button type="button" onClick={() => removeSaleItem(index)}>
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="empty-state">Select a product and quantity to add sale items.</p>
                  )}
                </div>

                <label>
                  Payment Mode
                  <select
                    value={salePaymentMode}
                    onChange={(e) => setSalePaymentMode(e.target.value)}
                  >
                    <option>Cash</option>
                    <option>UPI</option>
                    <option>Card</option>
                    <option>Credit</option>
                  </select>
                </label>
                <label>
                  Paid Amount
                  <input
                    type="number"
                    value={salePaidAmount}
                    onChange={(e) => setSalePaidAmount(e.target.value)}
                  />
                </label>
                <div className="totals">
                  <span>Subtotal: {formatCurrency(saleSubTotal)}</span>
                  <span>Due: {formatCurrency(saleDue)}</span>
                </div>
                <div className="form-actions">
                  <button type="submit">Complete Sale</button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setShowSalesList((prev) => !prev)}
                  >
                    {showSalesList ? 'Hide List' : 'Show List'}
                  </button>
                </div>
              </form>

              {receiptData && (
                <div className="panel-table receipt-preview">
                  <h3>Receipt Preview</h3>
                  <p><strong>Invoice:</strong> {receiptData.invoiceNo}</p>
                  <p><strong>Date:</strong> {receiptData.date.toLocaleString()}</p>
                  <p><strong>Customer:</strong> {receiptData.customerName}</p>
                  <p><strong>Payment Mode:</strong> {receiptData.paymentMode}</p>
                  <div className="receipt-items-preview">
                    <table>
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Qty</th>
                          <th>Price</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receiptData.items.map((item, index) => (
                          <tr key={`${item.name}-${index}`}>
                            <td>{item.name}</td>
                            <td>{item.quantity}</td>
                            <td>{formatCurrency(item.price)}</td>
                            <td>{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="receipt-actions">
                    <button type="button" className="secondary" onClick={() => printReceipt(receiptData)}>
                      Print Receipt
                    </button>
                    <button type="button" className="secondary" onClick={() => downloadReceiptPdf(receiptData)}>
                      Download PDF
                    </button>
                  </div>
                  <p className="receipt-footer-note">{receiptCompanyInfo.footerNote}</p>
                </div>
              )}

              {showSalesList ? (
                <div className="panel-table">
                  <h3>Sales History</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Customer</th>
                        <th>Total</th>
                        <th>Paid</th>
                        <th>Due</th>
                        <th>Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map((sale) => (
                        <tr key={sale.id}>
                          <td>{sale.invoiceNo}</td>
                          <td>{sale.customerName || 'Walk-in'}</td>
                          <td>{formatCurrency(sale.totalAmount || sale.grandTotal)}</td>
                          <td>{formatCurrency(sale.paidAmount)}</td>
                          <td>{formatCurrency(sale.dueAmount)}</td>
                          <td>
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => showSaleReceipt(sale)}
                            >
                              Receipt
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!sales.length && (
                        <tr>
                          <td colSpan="6">No sales recorded yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="panel-table">
                  <button type="button" className="secondary" onClick={() => setShowSalesList(true)}>
                    Show Sales History
                  </button>
                </div>
              )}
            </div>
          )}

          {view === 'people' && (
            <div className="panel-grid">
              <form className="panel-form" onSubmit={handlePersonSubmit}>
                <h3>Add Customer</h3>
                <label>
                  Search Customers
                  <input
                    value={peopleSearch}
                    onChange={(e) => setPeopleSearch(e.target.value)}
                    placeholder="Search by name, phone, address"
                  />
                </label>
                <label>
                  Name
                  <input
                    value={personForm.name}
                    onChange={(e) => setPersonForm({ ...personForm, name: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Phone
                  <input
                    value={personForm.phone}
                    onChange={(e) => setPersonForm({ ...personForm, phone: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Address
                  <input
                    value={personForm.address}
                    onChange={(e) => setPersonForm({ ...personForm, address: e.target.value })}
                  />
                </label>
                <div className="form-actions">
                  <button type="submit">Save Customer</button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setShowPeopleList((prev) => !prev)}
                  >
                    {showPeopleList ? 'Hide List' : 'Show List'}
                  </button>
                </div>
              </form>

              {showPeopleList ? (
                <div className="panel-table">
                  <h3>Customer List</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Address</th>
                        <th>Debt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPeople.map((person) => (
                        <tr key={person.id}>
                          <td>{person.name}</td>
                          <td>{person.phone}</td>
                          <td>{person.address || '-'}</td>
                          <td>{formatCurrency(person.currentDebt || 0)}</td>
                        </tr>
                      ))}
                      {!filteredPeople.length && (
                        <tr>
                          <td colSpan="4">No customers added yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="panel-table">
                  <button type="button" className="secondary" onClick={() => setShowPeopleList(true)}>
                    Show Customer List
                  </button>
                </div>
              )}
            </div>
          )}

          {view === 'accounts' && (
            <div className="panel-grid">
              <div className="panel-table">
                <h3>Ledger Summary</h3>
                <div className="summary-grid">
                  <div className="summary-card">
                    <strong>{formatCurrency(totalRevenue.toFixed(2))}</strong>
                    <span>Cash In</span>
                  </div>
                  <div className="summary-card">
                    <strong>{formatCurrency(totalExpenses.toFixed(2))}</strong>
                    <span>Cash Out</span>
                  </div>
                  <div className="summary-card">
                    <strong>{formatCurrency(netProfit.toFixed(2))}</strong>
                    <span>Net Position</span>
                  </div>
                  <div className="summary-card">
                    <strong>{formatCurrency(outstandingDues.toFixed(2))}</strong>
                    <span>Receivables</span>
                  </div>
                </div>
              </div>

              <div className="panel-table">
                <h3>Recent Transactions</h3>
                <div className="report-actions">
                  <button type="button" className="secondary" onClick={() => exportReport('ledger-report', ledgerEntries)}>
                    Export Excel
                  </button>
                  <button type="button" className="secondary" onClick={() => exportPdfReport('ledger-report', ledgerEntries)}>
                    Export PDF
                  </button>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Title</th>
                      <th>Amount</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerEntries.map((entry) => (
                      <tr key={entry.id + entry.type}>
                        <td>{entry.type}</td>
                        <td>{entry.title}</td>
                        <td>{formatCurrency(entry.amount)}</td>
                        <td>{new Date(entry.date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'sales-report' && (
            <div className="report-panel">
              <div className="panel-table">
                <div className="panel-header">
                  <div>
                    <h3>Full Sales Report</h3>
                    <p className="panel-subtitle">Filter sales by invoice, customer, or date and export the report easily.</p>
                  </div>
                  <div className="report-actions">
                    <button type="button" className="secondary" onClick={() => exportReport('sales-report', sortedSalesReportRows)}>
                      Export Excel
                    </button>
                    <button type="button" className="secondary" onClick={() => exportPdfReport('sales-report', sortedSalesReportRows)}>
                      Export PDF
                    </button>
                  </div>
                </div>

                <div className="report-summary">
                  <div className="report-summary-card">
                    <span>Records</span>
                    <strong>{salesReportTotals.count}</strong>
                  </div>
                  <div className="report-summary-card">
                    <span>Total Sales</span>
                    <strong>{formatCurrency(salesReportTotals.total.toFixed(2))}</strong>
                  </div>
                  <div className="report-summary-card">
                    <span>Total Paid</span>
                    <strong>{formatCurrency(salesReportTotals.paid.toFixed(2))}</strong>
                  </div>
                  <div className="report-summary-card">
                    <span>Total Due</span>
                    <strong>{formatCurrency(salesReportTotals.due.toFixed(2))}</strong>
                  </div>
                </div>

                <div className="report-controls">
                  <label>
                    Search sales
                    <input
                      type="search"
                      value={salesReportSearch}
                      onChange={(e) => setSalesReportSearch(e.target.value)}
                      placeholder="Search invoice, customer, or date"
                    />
                  </label>
                </div>

                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th className="sortable" onClick={() => handleSalesReportSort('invoiceNo')}>
                          Invoice
                        </th>
                        <th className="sortable" onClick={() => handleSalesReportSort('customerName')}>
                          Customer
                        </th>
                        <th className="sortable" onClick={() => handleSalesReportSort('total')}>
                          Total
                        </th>
                        <th className="sortable" onClick={() => handleSalesReportSort('paid')}>
                          Paid
                        </th>
                        <th className="sortable" onClick={() => handleSalesReportSort('due')}>
                          Due
                        </th>
                        <th className="sortable" onClick={() => handleSalesReportSort('date')}>
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedSalesReportRows.length ? (
                        sortedSalesReportRows.map((row, index) => (
                          <tr key={`${row.invoiceNo}-${index}`}>
                            <td>{row.invoiceNo}</td>
                            <td>{row.customerName}</td>
                            <td>{formatCurrency(row.total.toFixed(2))}</td>
                            <td>{formatCurrency(row.paid.toFixed(2))}</td>
                            <td>{formatCurrency(row.due.toFixed(2))}</td>
                            <td>{row.date}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="empty-state">
                            No sales records match the search filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="table-footer-row">
                        <td colSpan="2">Totals</td>
                        <td>{formatCurrency(salesReportTotals.total.toFixed(2))}</td>
                        <td>{formatCurrency(salesReportTotals.paid.toFixed(2))}</td>
                        <td>{formatCurrency(salesReportTotals.due.toFixed(2))}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {view === 'ledger' && (
            <div className="report-panel">
              <div className="stats-card-grid">
                <div className="stats-card">
                  <strong>{formatCurrency(ledgerTotals.customerDebt.toFixed(2))}</strong>
                  <span>Total Receivables</span>
                </div>
                <div className="stats-card">
                  <strong>{formatCurrency(ledgerTotals.supplierPayables.toFixed(2))}</strong>
                  <span>Total Payables</span>
                </div>
                <div className="stats-card">
                  <strong>{ledgerTotals.peopleCount}</strong>
                  <span>Customer Records</span>
                </div>
              </div>

              <div className="panel-grid">
                <div className="panel-table">
                  <div className="table-caption">
                    <h4>Customer Ledger</h4>
                    <span>Customers with current outstanding balances.</span>
                  </div>
                  <div className="report-actions">
                    <button type="button" className="secondary" onClick={() => exportReport('customer-ledger', people.map((person) => ({ name: person.name, phone: person.phone, debt: person.currentDebt || 0 })))}>
                      Export Excel
                    </button>
                    <button type="button" className="secondary" onClick={() => exportPdfReport('customer-ledger', people.map((person) => ({ name: person.name, phone: person.phone, debt: person.currentDebt || 0 })))}>
                      Export PDF
                    </button>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Debt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {people.map((person) => (
                        <tr key={person.id}>
                          <td>{person.name}</td>
                          <td>{person.phone}</td>
                          <td>{formatCurrency(Number(person.currentDebt || 0).toFixed(2))}</td>
                        </tr>
                      ))}
                      {!people.length && (
                        <tr>
                          <td colSpan="3" className="empty-state">No customer ledger entries found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="panel-table">
                  <div className="table-caption">
                    <h4>Supplier Ledger</h4>
                    <span>Supplier expenses and payables grouped by category.</span>
                  </div>
                  <div className="report-actions">
                    <button type="button" className="secondary" onClick={() => exportReport('supplier-ledger', expenses.map((expense) => ({ title: expense.title, category: expense.category, amount: expense.amount })))}>
                      Export Excel
                    </button>
                    <button type="button" className="secondary" onClick={() => exportPdfReport('supplier-ledger', expenses.map((expense) => ({ title: expense.title, category: expense.category, amount: expense.amount })))}>
                      Export PDF
                    </button>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((expense) => (
                        <tr key={expense.id}>
                          <td>{expense.title}</td>
                          <td>{expense.category}</td>
                          <td>{formatCurrency(Number(expense.amount || 0).toFixed(2))}</td>
                        </tr>
                      ))}
                      {!expenses.length && (
                        <tr>
                          <td colSpan="3" className="empty-state">No supplier expenses recorded yet.</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="table-footer-row">
                        <td colSpan="2">Total</td>
                        <td>{formatCurrency(expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0).toFixed(2))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {view === 'profit-loss' && (
            <div className="report-panel">
              <div className="stats-card-grid">
                <div className="stats-card">
                  <strong>{formatCurrency(totalRevenue.toFixed(2))}</strong>
                  <span>Total Sales</span>
                </div>
                <div className="stats-card">
                  <strong>{formatCurrency(totalExpenses.toFixed(2))}</strong>
                  <span>Total Expenses</span>
                </div>
                <div className="stats-card">
                  <strong>{formatCurrency(netProfit.toFixed(2))}</strong>
                  <span>Net Profit / Loss</span>
                </div>
                <div className="stats-card">
                  <strong>{profitMargin.toFixed(1)}%</strong>
                  <span>Profit Margin</span>
                </div>
              </div>
              <div className="panel-table">
                <div className="table-caption">
                  <h4>Profit & Loss Statement</h4>
                  <span>Year-to-date totals based on available sales and expense data.</span>
                </div>
                <div className="report-actions">
                  <button type="button" className="secondary" onClick={() => exportReport('profit-loss', [{ particular: 'Total Sales', amount: totalRevenue }, { particular: 'Total Expenses', amount: totalExpenses }, { particular: 'Net Profit / Loss', amount: netProfit }, { particular: 'Profit Margin %', amount: profitMargin }])}>
                    Export Excel
                  </button>
                  <button type="button" className="secondary" onClick={() => exportPdfReport('profit-loss', [{ particular: 'Total Sales', amount: totalRevenue }, { particular: 'Total Expenses', amount: totalExpenses }, { particular: 'Net Profit / Loss', amount: netProfit }, { particular: 'Profit Margin %', amount: profitMargin }])}>
                    Export PDF
                  </button>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Particular</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Total Sales</td>
                      <td>{formatCurrency(totalRevenue.toFixed(2))}</td>
                    </tr>
                    <tr>
                      <td>Total Expenses</td>
                      <td>{formatCurrency(totalExpenses.toFixed(2))}</td>
                    </tr>
                    <tr>
                      <td>Net Profit / Loss</td>
                      <td>{formatCurrency(netProfit.toFixed(2))}</td>
                    </tr>
                    <tr>
                      <td>Profit Margin</td>
                      <td>{profitMargin.toFixed(1)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'vendors' && (
            <div className="panel-grid">
              <form className="panel-form" onSubmit={handleVendorSubmit}>
                <h3>Add Vendor / Supplier</h3>
                <label>
                  Name
                  <input value={vendorForm.name} onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })} required />
                </label>
                <label>
                  Phone
                  <input value={vendorForm.phone} onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })} />
                </label>
                <label>
                  Address
                  <input value={vendorForm.address} onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })} />
                </label>
                <label>
                  GST Number
                  <input value={vendorForm.gstNo} onChange={(e) => setVendorForm({ ...vendorForm, gstNo: e.target.value })} />
                </label>
                <button type="submit">Save Vendor</button>
              </form>

              <div className="panel-table">
                <h3>Vendor List</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Address</th>
                      <th>GST</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map((vendor) => (
                      <tr key={vendor.id}>
                        <td>{vendor.name}</td>
                        <td>{vendor.phone}</td>
                        <td>{vendor.address}</td>
                        <td>{vendor.gstNo}</td>
                      </tr>
                    ))}
                    {!vendors.length && (
                      <tr>
                        <td colSpan="4">No vendors added yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'tax-summary' && (
            <div className="report-panel">
              <div className="stats-card-grid">
                <div className="stats-card">
                  <strong>{formatCurrency(taxSummary.taxableSales.toFixed(2))}</strong>
                  <span>Taxable Sales</span>
                </div>
                <div className="stats-card">
                  <strong>{formatCurrency(taxSummary.outputGST.toFixed(2))}</strong>
                  <span>Output GST</span>
                </div>
                <div className="stats-card">
                  <strong>{formatCurrency(taxSummary.inputGST.toFixed(2))}</strong>
                  <span>Input GST</span>
                </div>
                <div className="stats-card">
                  <strong>{formatCurrency(taxSummary.netTax.toFixed(2))}</strong>
                  <span>Net GST Liability</span>
                </div>
              </div>
              <div className="panel-table">
                <div className="table-caption">
                  <h4>Tax Summary</h4>
                  <span>GST-style estimate using a flat {taxSummary.taxRate * 100}% rate on sales and expenses.</span>
                </div>
                <div className="report-actions">
                  <button type="button" className="secondary" onClick={() => exportReport('tax-summary', [{ description: 'Taxable Sales', amount: taxSummary.taxableSales }, { description: 'Output GST', amount: taxSummary.outputGST }, { description: 'Taxable Expenses', amount: taxSummary.taxableExpenses }, { description: 'Input GST', amount: taxSummary.inputGST }, { description: 'Net GST Liability', amount: taxSummary.netTax }])}>
                    Export Excel
                  </button>
                  <button type="button" className="secondary" onClick={() => exportPdfReport('tax-summary', [{ description: 'Taxable Sales', amount: taxSummary.taxableSales }, { description: 'Output GST', amount: taxSummary.outputGST }, { description: 'Taxable Expenses', amount: taxSummary.taxableExpenses }, { description: 'Input GST', amount: taxSummary.inputGST }, { description: 'Net GST Liability', amount: taxSummary.netTax }])}>
                    Export PDF
                  </button>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Taxable Sales</td>
                      <td>{formatCurrency(taxSummary.taxableSales.toFixed(2))}</td>
                    </tr>
                    <tr>
                      <td>Output GST</td>
                      <td>{formatCurrency(taxSummary.outputGST.toFixed(2))}</td>
                    </tr>
                    <tr>
                      <td>Taxable Expenses</td>
                      <td>{formatCurrency(taxSummary.taxableExpenses.toFixed(2))}</td>
                    </tr>
                    <tr>
                      <td>Input GST</td>
                      <td>{formatCurrency(taxSummary.inputGST.toFixed(2))}</td>
                    </tr>
                    <tr>
                      <td>Net GST Liability</td>
                      <td>{formatCurrency(taxSummary.netTax.toFixed(2))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'monthly-comparison' && (
            <div className="report-panel">
              <div className="stats-card-grid">
                <div className="stats-card">
                  <strong>{formatCurrency(comparisonSummary.salesTotal.toFixed(2))}</strong>
                  <span>Total Sales (6 months)</span>
                </div>
                <div className="stats-card">
                  <strong>{formatCurrency(comparisonSummary.expenseTotal.toFixed(2))}</strong>
                  <span>Total Expenses (6 months)</span>
                </div>
                <div className="stats-card">
                  <strong>{comparisonSummary.bestMonth.label}</strong>
                  <span>Best Month</span>
                </div>
                <div className="stats-card">
                  <strong>{comparisonSummary.worstMonth.label}</strong>
                  <span>Lowest Margin</span>
                </div>
              </div>

              <div className="panel-table">
                <div className="table-caption">
                  <h4>Monthly Comparison</h4>
                  <span>Sales and expenses for the last 6 months, with variance and margin insight.</span>
                </div>
                <div className="report-actions">
                  <button type="button" className="secondary" onClick={() => exportReport('monthly-comparison', comparisonData.map((item) => ({ month: item.label, sales: item.salesValue, expenses: item.expenseValue, variance: item.variance, margin: Number(item.margin.toFixed(1)) })))}>
                    Export Excel
                  </button>
                  <button type="button" className="secondary" onClick={() => exportPdfReport('monthly-comparison', comparisonData.map((item) => ({ month: item.label, sales: item.salesValue, expenses: item.expenseValue, variance: item.variance, margin: Number(item.margin.toFixed(1)) })))}>
                    Export PDF
                  </button>
                </div>
                <div className="chart">
                  {comparisonData.map((item) => (
                    <div key={item.label} className="chart-column">
                      <div className="chart-bars">
                        <div className="bar revenue" style={{ height: `${item.salesHeight}%` }} />
                        <div className="bar expense" style={{ height: `${item.expenseHeight}%` }} />
                      </div>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Sales</th>
                        <th>Expenses</th>
                        <th>Variance</th>
                        <th>Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonData.map((item) => (
                        <tr key={item.label}>
                          <td>{item.label}</td>
                          <td>{formatCurrency(item.salesValue.toFixed(2))}</td>
                          <td>{formatCurrency(item.expenseValue.toFixed(2))}</td>
                          <td>{formatCurrency(item.variance.toFixed(2))}</td>
                          <td>{item.margin.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {view === 'expenses' && (
            <div className="panel-grid">
              <form className="panel-form" onSubmit={handleExpenseSubmit}>
                <h3>Record Expense</h3>
                <label>
                  Title
                  <input
                    value={expenseForm.title}
                    onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Amount
                  <input
                    type="number"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Category
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  >
                    <option>Utility</option>
                    <option>Food</option>
                    <option>Transport</option>
                    <option>Repair</option>
                    <option>Other</option>
                  </select>
                </label>
                <div className="form-actions">
                  <button type="submit">Add Expense</button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setShowExpensesList((prev) => !prev)}
                  >
                    {showExpensesList ? 'Hide List' : 'Show List'}
                  </button>
                </div>
              </form>

              {showExpensesList ? (
                <div className="panel-table">
                  <h3>Expense Log</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((expense) => (
                        <tr key={expense.id}>
                          <td>{expense.title}</td>
                          <td>{expense.category}</td>
                          <td>{formatCurrency(expense.amount)}</td>
                        </tr>
                      ))}
                      {!expenses.length && (
                        <tr>
                          <td colSpan="3">No expenses recorded yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="panel-table">
                  <button type="button" className="secondary" onClick={() => setShowExpensesList(true)}>
                    Show Expense Log
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
