import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  DollarSign, Printer, Share2, Mail, FileCheck, Receipt, Plus, Edit2, Trash2,
  Calendar, User, ShoppingBag, TrendingUp, Tag, Briefcase, Phone, ArrowRight,
  Search, MessageCircle, BarChart2, Shield, Settings, Globe, FileText, Grid,
  Download
} from 'lucide-react';

export function SalesPanel({
  salesProducts = [],
  setSalesProducts,
  salesInvoices = [],
  setSalesInvoices,
  businesses = [],
  categories = [],
  currentUser,
  lang,
  t
}: any) {
  const [activeTab, setActiveTab] = useState<'invoices' | 'products' | 'reports'>('invoices');

  // Administrator configurable maximum discount percent for members
  const [maxDiscountPercent, setMaxDiscountPercent] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('bh_sales_max_discount_pct');
      return saved ? Number(saved) : 20; // default to 20%
    } catch {
      return 20;
    }
  });

  const handleUpdateMaxDiscount = (val: number) => {
    setMaxDiscountPercent(val);
    localStorage.setItem('bh_sales_max_discount_pct', String(val));
  };

  // Modal control
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  const [invoiceViewModal, setInvoiceViewModal] = useState<any | null>(null);

  // Invoice Form State
  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: '',
    businessId: '',
    businessName: '',
    contactPhone: '',
    isCustomBusiness: false,
    productId: '',
    quantity: 1,
    startDate: new Date().toISOString().split('T')[0],
    discountPercent: 0,
    notes: '',
  });

  // Product Form State
  const [productForm, setProductForm] = useState({
    nameAr: '',
    nameEn: '',
    price: 0,
    unit: 'month' as string
  });

  // Dynamic Units of Measure state
  const [units, setUnits] = useState<{ id: string; nameAr: string; nameEn: string; days: number }[]>(() => {
    try {
      const saved = localStorage.getItem('bh_sales_units');
      return saved ? JSON.parse(saved) : [
        { id: 'day', nameAr: 'يوم', nameEn: 'Day', days: 1 },
        { id: 'week', nameAr: 'أسبوع', nameEn: 'Week', days: 7 },
        { id: 'month', nameAr: 'شهر', nameEn: 'Month', days: 30 },
      ];
    } catch {
      return [
        { id: 'day', nameAr: 'يوم', nameEn: 'Day', days: 1 },
        { id: 'week', nameAr: 'أسبوع', nameEn: 'Week', days: 7 },
        { id: 'month', nameAr: 'شهر', nameEn: 'Month', days: 30 },
      ];
    }
  });

  const [showUnitModal, setShowUnitModal] = useState(false);
  const [unitForm, setUnitForm] = useState({
    nameAr: '',
    nameEn: '',
    days: 30
  });

  const handleCreateUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForm.nameAr.trim() || !unitForm.nameEn.trim()) return;
    const newId = 'unit_' + Date.now();
    const newUnit = {
      id: newId,
      nameAr: unitForm.nameAr.trim(),
      nameEn: unitForm.nameEn.trim(),
      days: Number(unitForm.days) || 0
    };
    const updated = [...units, newUnit];
    setUnits(updated);
    localStorage.setItem('bh_sales_units', JSON.stringify(updated));
    setUnitForm({ nameAr: '', nameEn: '', days: 30 });
  };

  // Reports Filter State
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');

  // Business Search for Invoice creation
  const [businessSearchQuery, setBusinessSearchQuery] = useState('');
  const [isBusinessDropdownOpen, setIsBusinessDropdownOpen] = useState(false);

  const filteredBusinessesForInvoice = useMemo(() => {
    if (!businessSearchQuery.trim()) return businesses;
    const query = businessSearchQuery.toLowerCase();
    return businesses.filter((b: any) => 
      (b.nameAr && b.nameAr.toLowerCase().includes(query)) ||
      (b.nameEn && b.nameEn.toLowerCase().includes(query)) ||
      (b.phone && b.phone.includes(query)) ||
      (b.category && b.category.toLowerCase().includes(query))
    );
  }, [businesses, businessSearchQuery]);

  const isAdmin = currentUser?.role === 'admin';

  // End Date helper calculation
  const calculateEndDate = (startDateStr: string, unit: string, quantity: number): string => {
    if (!startDateStr) return '';
    const date = new Date(startDateStr);
    if (isNaN(date.getTime())) return '';

    const qty = Number(quantity) || 1;
    const foundUnit = units.find(u => u.id === unit);
    if (foundUnit) {
      if (foundUnit.days === 0) {
        return lang === 'ar' ? 'مفتوح (بلا تاريخ انتهاء)' : 'Open (No End Date)';
      }
      if (foundUnit.id === 'month') {
        date.setMonth(date.getMonth() + qty);
      } else {
        date.setDate(date.getDate() + qty * foundUnit.days);
      }
    } else {
      if (unit === 'day') {
        date.setDate(date.getDate() + qty);
      } else if (unit === 'week') {
        date.setDate(date.getDate() + qty * 7);
      } else if (unit === 'month') {
        date.setMonth(date.getMonth() + qty);
      }
    }
    return date.toISOString().split('T')[0];
  };

  // Trigger print dialog for invoice
  const handlePrintInvoice = (invoice: any) => {
    const container = document.createElement('div');
    container.id = 'print-modal-container';
    container.style.position = 'fixed';
    container.style.inset = '0';
    container.style.zIndex = '99999';
    container.style.backgroundColor = 'white';
    container.style.color = 'black';
    container.style.padding = '40px';
    container.style.fontFamily = 'system-ui, sans-serif';
    container.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

    const selectedProduct = salesProducts.find((p: any) => p.id === invoice.productId);
    const foundUnit = units.find(u => u.id === invoice.unit);
    const unitLabel = foundUnit
      ? (lang === 'ar' ? foundUnit.nameAr : foundUnit.nameEn)
      : invoice.unit === 'day' 
      ? (lang === 'ar' ? 'يوم' : 'Day') 
      : invoice.unit === 'week' 
      ? (lang === 'ar' ? 'أسبوع' : 'Week') 
      : (lang === 'ar' ? 'شهر' : 'Month');

    container.innerHTML = `
      <div style="max-width: 800px; margin: 0 auto; line-height: 1.6;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-b: 2px solid #ef4444; padding-bottom: 20px; margin-bottom: 30px;">
          <div>
            <h1 style="margin: 0; font-size: 28px; color: #dc2626; font-weight: 800;">${lang === 'ar' ? 'فاتورة ضريبية مبسطة' : 'Simplified Tax Invoice'}</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #4b5563;">${lang === 'ar' ? 'دليل منشآت ومواقع مملكة البحرين' : 'Bahrain Establishments & Directory Service'}</p>
          </div>
          <div style="text-align: ${lang === 'ar' ? 'left' : 'right'}; font-size: 14px; color: #1f2937;">
            <p style="margin: 2px 0;"><strong>${lang === 'ar' ? 'رقم الفاتورة:' : 'Invoice No:'}</strong> <span style="font-family: monospace; font-weight: bold; color: #dc2626;">${invoice.invoiceNumber}</span></p>
            <p style="margin: 2px 0;"><strong>${lang === 'ar' ? 'تاريخ الإصدار:' : 'Issue Date:'}</strong> ${new Date(invoice.createdAt || Date.now()).toLocaleDateString()}</p>
          </div>
        </div>

        <!-- Supplier & Client Info -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; font-size: 14px;">
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 12px; border: 1px solid #e5e7eb;">
            <h3 style="margin-top: 0; color: #dc2626; border-b: 1px solid #e5e7eb; padding-bottom: 6px; font-size: 15px;">${lang === 'ar' ? 'الجهة الموفرة للخدمة:' : 'Service Provider:'}</h3>
            <p style="margin: 4px 0;"><strong>${lang === 'ar' ? 'الاسم:' : 'Name:'}</strong> ${lang === 'ar' ? 'إدارة دليل خدمات البحرين' : 'Bahrain Directory Admin'}</p>
            <p style="margin: 4px 0;"><strong>${lang === 'ar' ? 'البريد الإلكتروني:' : 'Email:'}</strong> info@bahraindirectory.com</p>
          </div>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 12px; border: 1px solid #e5e7eb;">
            <h3 style="margin-top: 0; color: #dc2626; border-b: 1px solid #e5e7eb; padding-bottom: 6px; font-size: 15px;">${lang === 'ar' ? 'العميل المستفيد:' : 'Client Info:'}</h3>
            <p style="margin: 4px 0;"><strong>${lang === 'ar' ? 'المنشأة:' : 'Business Name:'}</strong> ${invoice.businessName}</p>
            <p style="margin: 4px 0;"><strong>${lang === 'ar' ? 'رقم التواصل:' : 'Phone No:'}</strong> ${invoice.contactPhone}</p>
          </div>
        </div>

        <!-- Description Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; text-align: ${lang === 'ar' ? 'right' : 'left'};">
          <thead>
            <tr style="background-color: #dc2626; color: white;">
              <th style="padding: 10px; border: 1px solid #dc2626;">#</th>
              <th style="padding: 10px; border: 1px solid #dc2626;">${lang === 'ar' ? 'بيان الخدمة الإعلانية' : 'Advertising Service Description'}</th>
              <th style="padding: 10px; border: 1px solid #dc2626; text-align: center;">${lang === 'ar' ? 'الوحدة' : 'Unit'}</th>
              <th style="padding: 10px; border: 1px solid #dc2626; text-align: center;">${lang === 'ar' ? 'الكمية' : 'Qty'}</th>
              <th style="padding: 10px; border: 1px solid #dc2626; text-align: center;">${lang === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</th>
              <th style="padding: 10px; border: 1px solid #dc2626; text-align: center;">${lang === 'ar' ? 'المجموع' : 'Total'}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 12px 10px; border: 1px solid #e5e7eb;">1</td>
              <td style="padding: 12px 10px; border: 1px solid #e5e7eb;">
                <strong>${invoice.productName}</strong>
                <div style="font-size: 11px; color: #4b5563; margin-top: 4px;">
                  ${lang === 'ar' ? 'تاريخ بداية الإعلان:' : 'Ad Start Date:'} ${invoice.startDate} 
                  &nbsp;|&nbsp; 
                  ${lang === 'ar' ? 'تاريخ نهاية الإعلان:' : 'Ad End Date:'} ${invoice.endDate}
                </div>
              </td>
              <td style="padding: 12px 10px; border: 1px solid #e5e7eb; text-align: center;">${unitLabel}</td>
              <td style="padding: 12px 10px; border: 1px solid #e5e7eb; text-align: center;">${invoice.quantity}</td>
              <td style="padding: 12px 10px; border: 1px solid #e5e7eb; text-align: center; font-family: monospace;">${invoice.price} BHD</td>
              <td style="padding: 12px 10px; border: 1px solid #e5e7eb; text-align: center; font-weight: bold; font-family: monospace;">${invoice.subtotal || invoice.totalAmount} BHD</td>
            </tr>
          </tbody>
        </table>

        <!-- Total section -->
        <div style="display: flex; justify-content: flex-end; font-size: 14px; margin-bottom: 30px;">
          <div style="width: 320px; background-color: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb; padding: 15px;">
            <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb; font-size: 13px;">
              <span>${lang === 'ar' ? 'المجموع قبل الخصم:' : 'Subtotal:'}</span>
              <span style="font-family: monospace;">${invoice.subtotal || invoice.totalAmount} BHD</span>
            </div>
            ${invoice.discountPercent > 0 ? `
            <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #b45309;">
              <span>${lang === 'ar' ? `الخصم المطبق (${invoice.discountPercent}%):` : `Discount Applied (${invoice.discountPercent}%):`}</span>
              <span style="font-family: monospace;">-${invoice.discountAmount} BHD</span>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 16px; color: #dc2626;">
              <span><strong>${lang === 'ar' ? 'المبلغ النهائي الصافي:' : 'Final Net Total:'}</strong></span>
              <strong style="font-family: monospace;">${invoice.totalAmount} BHD</strong>
            </div>
          </div>
        </div>

        ${invoice.notes ? `
        <!-- Invoice Notes -->
        <div style="margin-bottom: 30px; background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 15px; font-size: 13px; text-align: ${lang === 'ar' ? 'right' : 'left'};">
          <strong style="color: #b45309; display: block; margin-bottom: 6px;">${lang === 'ar' ? 'ملاحظات إضافية:' : 'Additional Notes:'}</strong>
          <p style="margin: 0; color: #4b5563; white-space: pre-line;">${invoice.notes}</p>
        </div>
        ` : ''}

        <!-- Footer terms -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; text-align: center; font-size: 11px; color: #6b7280; line-height: 1.5;">
          <p style="margin: 3px 0;">${lang === 'ar' ? 'نشكركم على ثقتكم الغالية والتعاون معنا.' : 'Thank you for your valuable trust and partnership.'}</p>
          <p style="margin: 3px 0;">${lang === 'ar' ? 'هذه الفاتورة مستخرجة آلياً وصالحة دون الحاجة إلى توقيع رسمي.' : 'This invoice is generated electronically and is valid without a physical signature.'}</p>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    const style = document.createElement('style');
    style.id = 'print-style';
    style.innerHTML = `
      @media print {
        body > * {
          display: none !important;
        }
        #print-modal-container {
          display: block !important;
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
        }
      }
    `;
    document.head.appendChild(style);

    window.print();

    setTimeout(() => {
      container.remove();
      const styleEl = document.getElementById('print-style');
      if (styleEl) styleEl.remove();
    }, 1000);
  };

  // Generate beautiful message for share
  const generateShareMessage = (inv: any) => {
    const foundUnit = units.find(u => u.id === inv.unit);
    const unitLabel = foundUnit
      ? (lang === 'ar' ? foundUnit.nameAr : foundUnit.nameEn)
      : inv.unit === 'day' 
      ? (lang === 'ar' ? 'أيام' : 'days') 
      : inv.unit === 'week' 
      ? (lang === 'ar' ? 'أسابيع' : 'weeks') 
      : (lang === 'ar' ? 'أشهر' : 'months');

    return lang === 'ar'
      ? `عزيزنا عميل دليل خدمات البحرين 🌟
تجدون أدناه تفاصيل فاتورة الإعلان الخاصة بمنشأتكم الكريم:

رقم الفاتورة: ${inv.invoiceNumber}
المنشأة المستفيدة: ${inv.businessName}
الخدمة المطلوبة: ${inv.productName}
المدة المتفق عليها: ${inv.quantity} ${unitLabel}
تاريخ بدء الإعلان: ${inv.startDate}
تاريخ انتهاء الإعلان: ${inv.endDate}

المبلغ الإجمالي المطلـوب: ${inv.totalAmount} دينار بحريني (BHD)

نشكركم على اختياركم لنا للترويج لمنشأتكم. يسعدنا تواصلكم الدائم معنا لأي استفسارات أو تعديلات 🌹`
      : `Dear Bahrain Directory Partner 🌟
Please find the invoice details for your advertising request below:

Invoice No: ${inv.invoiceNumber}
Beneficiary: ${inv.businessName}
Service: ${inv.productName}
Duration: ${inv.quantity} ${unitLabel}
Ad Start Date: ${inv.startDate}
Ad End Date: ${inv.endDate}

Total Amount Due: ${inv.totalAmount} BHD

Thank you for promoting your business with us! If you have any inquiries, feel free to reply. 🌹`;
  };

  // Share via WhatsApp
  const handleShareWhatsapp = (inv: any) => {
    const text = encodeURIComponent(generateShareMessage(inv));
    const cleanPhone = inv.contactPhone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  // Share via Email
  const handleShareEmail = (inv: any) => {
    const text = encodeURIComponent(generateShareMessage(inv));
    const subject = encodeURIComponent(lang === 'ar' ? `فاتورة إعلان رقم - ${inv.invoiceNumber}` : `Ad Invoice - ${inv.invoiceNumber}`);
    window.open(`mailto:?subject=${subject}&body=${text}`, '_blank');
  };

  // Open creation modal for Invoice
  const handleOpenCreateInvoice = () => {
    const nextNum = 1000 + (salesInvoices.length + 1);
    const generatedNum = `INV-${new Date().getFullYear()}-${nextNum}`;
    
    // Choose first product as default
    const defaultProduct = salesProducts[0]?.id || '';

    setInvoiceForm({
      invoiceNumber: generatedNum,
      businessId: '',
      businessName: '',
      contactPhone: '',
      isCustomBusiness: false,
      productId: defaultProduct,
      quantity: 1,
      startDate: new Date().toISOString().split('T')[0],
      discountPercent: 0,
      notes: '',
    });
    setEditingInvoice(null);
    setShowInvoiceModal(true);
  };

  // Save/Edit Invoice
  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.businessName) {
      alert(lang === 'ar' ? 'الرجاء تحديد المنشأة المستفيدة أولاً.' : 'Please choose the beneficiary business first.');
      return;
    }
    const product = salesProducts.find((p: any) => p.id === invoiceForm.productId);
    if (!product) return;

    const endDate = calculateEndDate(invoiceForm.startDate, product.unit, invoiceForm.quantity);
    
    const subtotal = product.price * invoiceForm.quantity;
    const discountPercent = Number(invoiceForm.discountPercent) || 0;

    // Check discount limit: only apply for non-admins (or if they want it globally, let's allow admins to override, and restrict members)
    if (!isAdmin && discountPercent > maxDiscountPercent) {
      alert(lang === 'ar' 
        ? `عذراً، لا يمكن تطبيق خصم يتجاوز الحد الأقصى المسموح به للأعضاء وهو ${maxDiscountPercent}%` 
        : `Sorry, you cannot apply a discount exceeding the maximum member limit of ${maxDiscountPercent}%`
      );
      return;
    }

    const discountAmount = Number((subtotal * (discountPercent / 100)).toFixed(2));
    const totalAmount = Number((subtotal - discountAmount).toFixed(2));

    if (editingInvoice) {
      // Edit mode
      setSalesInvoices((prev: any[]) => prev.map(inv => {
        if (inv.id === editingInvoice.id) {
          return {
            ...inv,
            businessId: invoiceForm.isCustomBusiness ? '' : invoiceForm.businessId,
            businessName: invoiceForm.businessName,
            contactPhone: invoiceForm.contactPhone,
            productId: invoiceForm.productId,
            productName: product.nameAr,
            price: product.price,
            unit: product.unit,
            quantity: invoiceForm.quantity,
            startDate: invoiceForm.startDate,
            endDate,
            subtotal,
            discountPercent,
            discountAmount,
            totalAmount,
            notes: invoiceForm.notes,
          };
        }
        return inv;
      }));
    } else {
      // Create mode
      const newInvoice = {
        id: 'inv_' + Math.random().toString(36).substr(2, 9),
        invoiceNumber: invoiceForm.invoiceNumber,
        businessId: invoiceForm.isCustomBusiness ? '' : invoiceForm.businessId,
        businessName: invoiceForm.businessName,
        contactPhone: invoiceForm.contactPhone,
        productId: invoiceForm.productId,
        productName: product.nameAr,
        price: product.price,
        unit: product.unit,
        quantity: invoiceForm.quantity,
        startDate: invoiceForm.startDate,
        endDate,
        subtotal,
        discountPercent,
        discountAmount,
        totalAmount,
        notes: invoiceForm.notes,
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.username || 'admin',
        createdByName: currentUser?.username || 'admin',
      };
      setSalesInvoices((prev: any[]) => [newInvoice, ...prev]);
    }

    setShowInvoiceModal(false);
  };

  // Load existing values for editing
  const handleEditInvoiceTrigger = (inv: any) => {
    setInvoiceForm({
      invoiceNumber: inv.invoiceNumber,
      businessId: inv.businessId || '',
      businessName: inv.businessName,
      contactPhone: inv.contactPhone,
      isCustomBusiness: !inv.businessId,
      productId: inv.productId,
      quantity: inv.quantity,
      startDate: inv.startDate,
      discountPercent: inv.discountPercent || 0,
      notes: inv.notes || '',
    });
    setEditingInvoice(inv);
    setShowInvoiceModal(true);
  };

  // Delete invoice (admin only)
  const handleDeleteInvoice = (id: string) => {
    if (confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذه الفاتورة نهائياً؟' : 'Are you sure you want to permanently delete this invoice?')) {
      setSalesInvoices((prev: any[]) => prev.filter(inv => inv.id !== id));
    }
  };

  // Open modal to Create Product
  const handleOpenCreateProduct = () => {
    setProductForm({
      nameAr: '',
      nameEn: '',
      price: 0,
      unit: 'month'
    });
    setEditingProduct(null);
    setShowProductModal(true);
  };

  // Save/Edit Product
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      setSalesProducts((prev: any[]) => prev.map(p => {
        if (p.id === editingProduct.id) {
          return {
            ...p,
            nameAr: productForm.nameAr,
            nameEn: productForm.nameEn,
            price: Number(productForm.price),
            unit: productForm.unit
          };
        }
        return p;
      }));
    } else {
      const newProduct = {
        id: 'prod_' + Math.random().toString(36).substr(2, 9),
        nameAr: productForm.nameAr,
        nameEn: productForm.nameEn,
        price: Number(productForm.price),
        unit: productForm.unit
      };
      setSalesProducts((prev: any[]) => [...prev, newProduct]);
    }
    setShowProductModal(false);
  };

  // Trigger Edit Product modal
  const handleEditProductTrigger = (prod: any) => {
    setProductForm({
      nameAr: prod.nameAr,
      nameEn: prod.nameEn,
      price: prod.price,
      unit: prod.unit
    });
    setEditingProduct(prod);
    setShowProductModal(true);
  };

  // Delete product (admin only)
  const handleDeleteProduct = (id: string) => {
    if (confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا المنتج والأسعار؟' : 'Are you sure you want to delete this product and its pricing?')) {
      setSalesProducts((prev: any[]) => prev.filter(p => p.id !== id));
    }
  };

  // Reports Computations (Dynamic grouping & math)
  const reportStats = useMemo(() => {
    let filtered = [...salesInvoices];

    // Filter by dates if specified
    if (reportStartDate) {
      filtered = filtered.filter(inv => inv.startDate >= reportStartDate);
    }
    if (reportEndDate) {
      filtered = filtered.filter(inv => inv.startDate <= reportEndDate);
    }

    const totalSales = filtered.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const invoiceCount = filtered.length;
    const averageInvoice = invoiceCount > 0 ? (totalSales / invoiceCount) : 0;

    // Grouping by Main Business Categories
    const categoryGroup: { [key: string]: number } = {};
    const subcategoryGroup: { [key: string]: number } = {};
    const memberGroup: { [key: string]: number } = {};

    filtered.forEach(inv => {
      // Category lookup
      let catName = lang === 'ar' ? 'غير مصنف / مخصص' : 'Uncategorized';
      let subcatName = lang === 'ar' ? 'خدمات عامة' : 'General Services';
      
      if (inv.businessId) {
        const foundBiz = businesses.find((b: any) => b.id === inv.businessId);
        if (foundBiz) {
          const foundCat = categories.find((c: any) => c.id === foundBiz.category);
          if (foundCat) {
            catName = lang === 'ar' ? foundCat.titleAr : foundCat.titleEn;
          } else {
            const standardCatNames: any = {
              'restaurants': lang === 'ar' ? 'المطاعم والكافيهات' : 'Restaurants & Cafes',
              'supermarkets': lang === 'ar' ? 'سوبرماركت وبرادات' : 'Supermarkets & Coldstores',
              'health': lang === 'ar' ? 'الصحة' : 'Health',
              'cars': lang === 'ar' ? 'السيارات' : 'Automotive',
              'shopping': lang === 'ar' ? 'تسوق وأقسام أخرى' : 'Shopping & Others',
              'services': lang === 'ar' ? 'خدمات ترفيهية وعقارات' : 'Leisure & Real Estate'
            };
            catName = standardCatNames[foundBiz.category] || foundBiz.category || catName;
          }
          subcatName = foundBiz.subCategory || subcatName;
        }
      }

      categoryGroup[catName] = (categoryGroup[catName] || 0) + inv.totalAmount;
      subcategoryGroup[subcatName] = (subcategoryGroup[subcatName] || 0) + inv.totalAmount;

      // Member lookup
      const creator = inv.createdByName || inv.createdBy || 'Unknown';
      memberGroup[creator] = (memberGroup[creator] || 0) + inv.totalAmount;
    });

    return {
      totalSales,
      invoiceCount,
      averageInvoice,
      categoryGroup,
      subcategoryGroup,
      memberGroup,
      filteredInvoices: filtered
    };
  }, [salesInvoices, reportStartDate, reportEndDate, businesses, categories, lang]);

  // Export reports to Excel (XLSX) format
  const handleExportToExcel = () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const filename = lang === 'ar' 
        ? `تقرير_المبيعات_والحسابات_${today}.xlsx` 
        : `sales_and_invoicing_report_${today}.xlsx`;

      // --- Sheet 1: Summary / ملخص الأداء ---
      const summaryRows: any[][] = [];
      
      if (lang === 'ar') {
        summaryRows.push(["تقرير المبيعات والحسابات - دليل البحرين التجاري"]);
        summaryRows.push(["تاريخ التصدير", today]);
        summaryRows.push(["الفترة المشمولة في التقرير", `${reportStartDate || 'البداية'} إلى ${reportEndDate || 'اليوم'}`]);
        summaryRows.push([]);
        
        summaryRows.push(["المؤشرات المالية الرئيسية"]);
        summaryRows.push(["المؤشر", "القيمة"]);
        summaryRows.push(["إجمالي الإيرادات / المبيعات", `${reportStats.totalSales.toFixed(2)} BHD`]);
        summaryRows.push(["عدد الفواتير الصادرة", reportStats.invoiceCount]);
        summaryRows.push(["متوسط قيمة الفاتورة", `${reportStats.averageInvoice.toFixed(2)} BHD`]);
        summaryRows.push([]);

        summaryRows.push(["الإيرادات وتوزيعها بحسب أقسام المنشآت"]);
        summaryRows.push(["القسم التجاري", "المبيعات (BHD)", "النسبة المئوية (%)"]);
        Object.entries(reportStats.categoryGroup).forEach(([cat, val]) => {
          const pct = reportStats.totalSales > 0 ? ((val / reportStats.totalSales) * 100).toFixed(1) : "0";
          summaryRows.push([cat, val, `${pct}%`]);
        });
        summaryRows.push([]);

        summaryRows.push(["المبيعات بحسب منشئي الفواتير (المسؤولين)"]);
        summaryRows.push(["اسم المستخدم", "المبيعات (BHD)", "النسبة المئوية (%)"]);
        Object.entries(reportStats.memberGroup).forEach(([memb, val]) => {
          const pct = reportStats.totalSales > 0 ? ((val / reportStats.totalSales) * 100).toFixed(1) : "0";
          summaryRows.push([memb, val, `${pct}%`]);
        });
      } else {
        summaryRows.push(["Sales & Invoicing Report - Bahrain Commercial Directory"]);
        summaryRows.push(["Export Date", today]);
        summaryRows.push(["Report Period", `${reportStartDate || 'Beginning'} to ${reportEndDate || 'Today'}`]);
        summaryRows.push([]);
        
        summaryRows.push(["Key Performance Indicators (KPIs)"]);
        summaryRows.push(["Indicator", "Value"]);
        summaryRows.push(["Total Revenue", `${reportStats.totalSales.toFixed(2)} BHD`]);
        summaryRows.push(["Invoices Issued", reportStats.invoiceCount]);
        summaryRows.push(["Average Invoice Value", `${reportStats.averageInvoice.toFixed(2)} BHD`]);
        summaryRows.push([]);

        summaryRows.push(["Revenue by Department/Category"]);
        summaryRows.push(["Category", "Sales (BHD)", "Percentage (%)"]);
        Object.entries(reportStats.categoryGroup).forEach(([cat, val]) => {
          const pct = reportStats.totalSales > 0 ? ((val / reportStats.totalSales) * 100).toFixed(1) : "0";
          summaryRows.push([cat, val, `${pct}%`]);
        });
        summaryRows.push([]);

        summaryRows.push(["Revenue by Billed Staff Member"]);
        summaryRows.push(["Staff Member", "Sales (BHD)", "Percentage (%)"]);
        Object.entries(reportStats.memberGroup).forEach(([memb, val]) => {
          const pct = reportStats.totalSales > 0 ? ((val / reportStats.totalSales) * 100).toFixed(1) : "0";
          summaryRows.push([memb, val, `${pct}%`]);
        });
      }

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);

      // --- Sheet 2: Detailed Log / سجل الفواتير التفصيلي ---
      const detailRows: any[][] = [];
      if (lang === 'ar') {
        detailRows.push([
          "رقم الفاتورة",
          "المنشأة المستفيدة",
          "رقم التواصل",
          "المنتج / الإعلان الباقة",
          "السعر الفردي",
          "الكمية / المدة",
          "الوحدة",
          "القيمة الإجمالية (BHD)",
          "تاريخ البدء",
          "تاريخ الانتهاء",
          "تاريخ الإنشاء",
          "المحرر / المسؤول"
        ]);
      } else {
        detailRows.push([
          "Invoice No",
          "Beneficiary Business",
          "Contact Phone",
          "Product / Ad Package",
          "Unit Price",
          "Quantity / Duration",
          "Unit",
          "Total Amount (BHD)",
          "Start Date",
          "End Date",
          "Created At",
          "Billed By"
        ]);
      }

      reportStats.filteredInvoices.forEach((inv: any) => {
        const foundUnit = units.find(u => u.id === inv.unit);
        const unitLabel = foundUnit
          ? (lang === 'ar' ? foundUnit.nameAr : foundUnit.nameEn)
          : inv.unit === 'day' 
          ? (lang === 'ar' ? 'يوم' : 'days') 
          : inv.unit === 'week' 
          ? (lang === 'ar' ? 'أسبوع' : 'weeks') 
          : (lang === 'ar' ? 'شهر' : 'months');

        const createdAtFormatted = inv.createdAt ? inv.createdAt.split('T')[0] : '';

        detailRows.push([
          inv.invoiceNumber || '',
          inv.businessName || '',
          inv.contactPhone || '',
          inv.productName || '',
          inv.price || 0,
          inv.quantity || 0,
          unitLabel,
          inv.totalAmount || 0,
          inv.startDate || '',
          inv.endDate || '',
          createdAtFormatted,
          inv.createdByName || inv.createdBy || ''
        ]);
      });

      const detailSheet = XLSX.utils.aoa_to_sheet(detailRows);

      // Create workbook and append sheets
      const workbook = XLSX.utils.book_new();
      const sheet1Name = lang === 'ar' ? 'ملخص التقارير' : 'Summary Statistics';
      const sheet2Name = lang === 'ar' ? 'سجل الفواتير التفصيلي' : 'Detailed Invoices Log';
      
      XLSX.utils.book_append_sheet(workbook, summarySheet, sheet1Name);
      XLSX.utils.book_append_sheet(workbook, detailSheet, sheet2Name);

      // Generate buffer and trigger download
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export sales to excel:", error);
      alert(lang === 'ar' ? "فشل تصدير التقرير إلى إكسل." : "Failed to export report to Excel.");
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-gray-100 dark:border-slate-700 shadow-md space-y-6 text-right animate-fadeIn" dir="rtl">
      {/* Tab Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 dark:border-slate-700 pb-4 gap-4">
        <div>
          <h3 className="font-bold text-xl text-gray-800 dark:text-slate-100 flex items-center gap-2 justify-start">
            <ShoppingBag className="h-6 w-6 text-red-600 shrink-0" />
            <span>{lang === 'ar' ? 'إدارة المبيعات والحسابات' : 'Sales & Invoicing Management'}</span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            {lang === 'ar' 
              ? 'أدوات المبيعات، إعداد الفواتير الضريبية للعملاء، تصديرها كـ PDF، رصد فترات الإعلانات، وعرض تقارير الأرباح.' 
              : 'Sales tools, billing client invoices, exporting PDF files, automated ad tracking and reporting.'}
          </p>
        </div>

        {/* Sales Sub-Tabs */}
        <div className="flex bg-gray-50 dark:bg-slate-900 rounded-2xl p-1 border border-gray-100 dark:border-slate-800 self-stretch md:self-auto">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'invoices' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-600 dark:text-slate-300 hover:text-red-600'}`}
          >
            <Receipt className="h-4 w-4" />
            <span>{lang === 'ar' ? 'إعداد الفواتير' : 'Invoices'}</span>
          </button>
          
          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'products' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-600 dark:text-slate-300 hover:text-red-600'}`}
          >
            <Tag className="h-4 w-4" />
            <span>{lang === 'ar' ? 'المنتجات والأسعار' : 'Products & Pricing'}</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'reports' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-600 dark:text-slate-300 hover:text-red-600'}`}
          >
            <BarChart2 className="h-4 w-4" />
            <span>{lang === 'ar' ? 'التقارير والإحصائيات' : 'Sales Reports'}</span>
          </button>
        </div>
      </div>

      {/* ────────────────── INVOICES TAB ────────────────── */}
      {activeTab === 'invoices' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Admin configuration of max discount */}
          {isAdmin && (
            <div className="bg-red-50/40 dark:bg-red-950/10 p-4 rounded-2xl border border-red-100 dark:border-red-900/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="text-right">
                <h5 className="font-bold text-xs text-red-800 dark:text-red-300 flex items-center gap-1.5 justify-start">
                  <Shield className="h-4 w-4 text-red-600" />
                  <span>{lang === 'ar' ? 'سقف خصومات أعضاء وموظفي المبيعات' : 'Member Discount Limits'}</span>
                </h5>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">
                  {lang === 'ar'
                    ? 'حدد الحد الأقصى لنسبة الخصم التي يمكن للأعضاء تطبيقها على الفاتورة.'
                    : 'Set the maximum percentage discount members can apply to invoices.'}
                </p>
              </div>
              <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                <span className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                  {lang === 'ar' ? 'الحد الأقصى للخصم:' : 'Max limit:'}
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={maxDiscountPercent}
                    onChange={e => handleUpdateMaxDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                    className="w-16 px-2 py-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-bold text-center text-red-600 outline-none"
                  />
                  <span className="text-xs font-bold text-gray-500">%</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <h4 className="font-bold text-sm text-gray-700 dark:text-slate-200">
              {lang === 'ar' ? 'سجل الفواتير الصادرة للعملاء' : 'Client Invoices List'}
            </h4>
            <button
              onClick={handleOpenCreateInvoice}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>{lang === 'ar' ? 'إصدار فاتورة جديدة' : 'Create New Invoice'}</span>
            </button>
          </div>

          {salesInvoices.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-slate-900/40 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700">
              <Receipt className="h-12 w-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">
                {lang === 'ar' ? 'لا توجد فواتير صادرة حالياً.' : 'No invoices issued yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 text-gray-500 dark:text-slate-400 font-bold">
                    <th className="p-3">{lang === 'ar' ? 'رقم الفاتورة' : 'Invoice No.'}</th>
                    <th className="p-3">{lang === 'ar' ? 'المنشأة المستفيدة' : 'Business'}</th>
                    <th className="p-3">{lang === 'ar' ? 'التفاصيل / الخدمة' : 'Service Item'}</th>
                    <th className="p-3 text-center">{lang === 'ar' ? 'فترة الإعلان' : 'Ad Duration'}</th>
                    <th className="p-3 text-center">{lang === 'ar' ? 'المجموع' : 'Total Amount'}</th>
                    <th className="p-3 text-center">{lang === 'ar' ? 'بواسطة' : 'Created By'}</th>
                    <th className="p-3 text-left">{lang === 'ar' ? 'الإجراءات والتصدير' : 'Actions & Export'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 dark:divide-slate-700/60">
                  {salesInvoices.map((inv: any) => {
                    // Check if edit is allowed (created by current user or admin)
                    const canEdit = isAdmin || inv.createdBy === currentUser?.username || inv.createdByName === currentUser?.username;

                    return (
                      <tr key={inv.id} className="hover:bg-gray-50/40 dark:hover:bg-slate-900/10 transition-colors">
                        <td className="p-3 font-mono font-bold text-red-600 dark:text-red-400">{inv.invoiceNumber}</td>
                        <td className="p-3">
                          <span className="font-bold text-gray-800 dark:text-slate-200 block">{inv.businessName}</span>
                          <span className="text-[10px] text-gray-400 font-mono block">{inv.contactPhone}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold">{inv.productName}</span>
                          <span className="text-[10px] text-gray-400 block">
                            {lang === 'ar' ? 'سعر الوحدة:' : 'Rate:'} {inv.price} BHD / {
                              units.find(u => u.id === inv.unit)
                                ? (lang === 'ar' ? units.find(u => u.id === inv.unit)?.nameAr : units.find(u => u.id === inv.unit)?.nameEn)
                                : (inv.unit === 'day' ? (lang === 'ar' ? 'يوم' : 'day') : inv.unit === 'week' ? (lang === 'ar' ? 'أسبوع' : 'week') : (lang === 'ar' ? 'شهر' : 'month'))
                            }
                          </span>
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <div className="font-medium text-gray-700 dark:text-slate-200">
                            {inv.quantity} {
                              units.find(u => u.id === inv.unit)
                                ? (lang === 'ar' ? units.find(u => u.id === inv.unit)?.nameAr : units.find(u => u.id === inv.unit)?.nameEn)
                                : (inv.unit === 'day' ? (lang === 'ar' ? 'أيام' : 'days') : inv.unit === 'week' ? (lang === 'ar' ? 'أسابيع' : 'weeks') : (lang === 'ar' ? 'أشهر' : 'months'))
                            }
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {inv.startDate} ➔ {inv.endDate}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="font-mono font-bold text-gray-900 dark:text-slate-100 text-sm">
                            {inv.totalAmount} BHD
                          </div>
                          {inv.discountPercent > 0 && (
                            <span className="inline-block text-[9px] font-extrabold bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-md mt-0.5">
                              {lang === 'ar' ? `خصم ${inv.discountPercent}%` : `-${inv.discountPercent}% Off`}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center text-[10px] text-gray-400 font-medium">@{inv.createdByName || inv.createdBy}</td>
                        <td className="p-3 text-left">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* PDF Print Button */}
                            <button
                              onClick={() => handlePrintInvoice(inv)}
                              title={lang === 'ar' ? 'طباعة / تصدير PDF' : 'Print / Save PDF'}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-600 dark:text-slate-300 transition-colors"
                            >
                              <Printer className="h-4.5 w-4.5" />
                            </button>

                            {/* WhatsApp share */}
                            <button
                              onClick={() => handleShareWhatsapp(inv)}
                              title={lang === 'ar' ? 'إرسال عبر الواتساب' : 'Send via WhatsApp'}
                              className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg text-emerald-600 transition-colors"
                            >
                              <MessageCircle className="h-4.5 w-4.5" />
                            </button>

                            {/* Email share */}
                            <button
                              onClick={() => handleShareEmail(inv)}
                              title={lang === 'ar' ? 'إرسال عبر البريد الإلكتروني' : 'Send via Email'}
                              className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg text-blue-600 transition-colors"
                            >
                              <Mail className="h-4.5 w-4.5" />
                            </button>

                            {/* Edit invoice */}
                            {canEdit && (
                              <button
                                onClick={() => handleEditInvoiceTrigger(inv)}
                                title={lang === 'ar' ? 'تعديل الفاتورة' : 'Edit Invoice'}
                                className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-lg text-amber-600 transition-colors"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            )}

                            {/* Delete invoice (Admin only) */}
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteInvoice(inv.id)}
                                title={lang === 'ar' ? 'حذف الفاتورة' : 'Delete Invoice'}
                                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-red-600 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ────────────────── PRODUCTS TAB ────────────────── */}
      {activeTab === 'products' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Admin validation wrapper */}
          {!isAdmin ? (
            <div className="p-6 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-900/30 text-center space-y-3">
              <Shield className="h-10 w-10 mx-auto" />
              <h5 className="font-bold text-sm">{lang === 'ar' ? 'صلاحيات غير كافية' : 'Insufficient Permissions'}</h5>
              <p className="text-xs">
                {lang === 'ar' ? 'عذراً، تقع صلاحية تعديل الخطط وباقات الأسعار للمدير والمسؤولين فقط.' : 'Sorry, only the system manager can configure ad packages and prices.'}
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h4 className="font-bold text-sm text-gray-700 dark:text-slate-200">
                  {lang === 'ar' ? 'المنتجات والخدمات وباقات الأسعار' : 'Ad Packages & Pricing Configuration'}
                </h4>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setShowUnitModal(true)}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors shadow-sm"
                  >
                    <Settings className="h-4 w-4 text-red-600" />
                    <span>{lang === 'ar' ? 'إدارة وحدات القياس' : 'Manage Units'}</span>
                  </button>

                  <button
                    onClick={handleOpenCreateProduct}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{lang === 'ar' ? 'إضافة منتج/سعر جديد' : 'Add New Product'}</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 text-gray-500 dark:text-slate-400 font-bold">
                      <th className="p-3">{lang === 'ar' ? 'المنتج / الباقة باللغة العربية' : 'Product (Ar)'}</th>
                      <th className="p-3">{lang === 'ar' ? 'المنتج / الباقة باللغة الإنجليزية' : 'Product (En)'}</th>
                      <th className="p-3 text-center">{lang === 'ar' ? 'السعر' : 'Price'}</th>
                      <th className="p-3 text-center">{lang === 'ar' ? 'وحدة القياس / الدورة' : 'Unit Cycle'}</th>
                      <th className="p-3 text-left">{lang === 'ar' ? 'التحكم' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 dark:divide-slate-700/60">
                    {salesProducts.map((prod: any) => (
                      <tr key={prod.id} className="hover:bg-gray-50/40 dark:hover:bg-slate-900/10 transition-colors">
                        <td className="p-3 font-semibold text-gray-800 dark:text-slate-200">{prod.nameAr}</td>
                        <td className="p-3 font-semibold text-gray-600 dark:text-slate-400 ltr text-left">{prod.nameEn}</td>
                        <td className="p-3 text-center font-mono font-bold text-sm text-gray-900 dark:text-slate-100">{prod.price} BHD</td>
                        <td className="p-3 text-center">
                          <span className="px-2.5 py-1 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-full font-bold text-[10px]">
                            {(() => {
                              const found = units.find(u => u.id === prod.unit);
                              if (found) return lang === 'ar' ? found.nameAr : found.nameEn;
                              return prod.unit === 'day' 
                                ? (lang === 'ar' ? 'يومي' : 'Daily') 
                                : prod.unit === 'week' 
                                ? (lang === 'ar' ? 'أسبوعي' : 'Weekly') 
                                : (lang === 'ar' ? 'شهري' : 'Monthly');
                            })()}
                          </span>
                        </td>
                        <td className="p-3 text-left">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleEditProductTrigger(prod)}
                              className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-lg text-amber-600 transition-colors"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prod.id)}
                              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-red-600 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ────────────────── REPORTS TAB ────────────────── */}
      {activeTab === 'reports' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Admin validation wrapper */}
          {!isAdmin ? (
            <div className="p-6 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-900/30 text-center space-y-3">
              <Shield className="h-10 w-10 mx-auto" />
              <h5 className="font-bold text-sm">{lang === 'ar' ? 'صلاحيات غير كافية' : 'Insufficient Permissions'}</h5>
              <p className="text-xs">
                {lang === 'ar' ? 'عذراً، تقع صلاحية مراجعة التقارير المالية والتحليلات للمدير العام فقط.' : 'Only the system manager has access to financial and analytics reports.'}
              </p>
            </div>
          ) : (
            <>
              {/* Filters Header */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gray-50 dark:bg-slate-900 p-4 rounded-2xl border border-gray-150 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-red-600" />
                  <span className="font-bold text-xs">{lang === 'ar' ? 'فلترة التقارير بتواريخ معينة:' : 'Filter reports by dates:'}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] text-gray-500 font-bold">{lang === 'ar' ? 'من' : 'From'}</label>
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={e => setReportStartDate(e.target.value)}
                      className="px-2.5 py-1.5 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-400 font-mono"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] text-gray-500 font-bold">{lang === 'ar' ? 'إلى' : 'To'}</label>
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={e => setReportEndDate(e.target.value)}
                      className="px-2.5 py-1.5 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-400 font-mono"
                    />
                  </div>
                  {(reportStartDate || reportEndDate) && (
                    <button
                      onClick={() => { setReportStartDate(''); setReportEndDate(''); }}
                      className="px-2.5 py-1.5 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-[10px] font-bold"
                    >
                      {lang === 'ar' ? 'مسح الفلتر' : 'Clear'}
                    </button>
                  )}
                  
                  <button
                    onClick={handleExportToExcel}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-[0.98] mr-auto md:mr-0"
                    title={lang === 'ar' ? 'تصدير كامل التقرير إلى ملف إكسل XLSX' : 'Export complete report to Excel XLSX'}
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>{lang === 'ar' ? 'تصدير إكسل (XLSX)' : 'Export Excel (XLSX)'}</span>
                  </button>
                </div>
              </div>

              {/* Big KPI Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Revenue card */}
                <div className="bg-gradient-to-br from-red-600 to-rose-700 text-white rounded-2xl p-5 shadow-sm space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-xl -ml-6 -mt-6" />
                  <div className="flex justify-between items-center relative z-10">
                    <span className="text-xs font-bold opacity-80">{lang === 'ar' ? 'إجمالي الإيرادات / المبيعات' : 'Total Revenue'}</span>
                    <DollarSign className="h-5 w-5 opacity-90" />
                  </div>
                  <div className="relative z-10 font-mono text-2xl font-black">{reportStats.totalSales.toFixed(2)} BHD</div>
                  <p className="text-[10px] text-red-100">
                    {lang === 'ar' ? 'إجمالي المبالغ المفروشة من فواتير الإعلانات' : 'Total amounts billed from ad invoices'}
                  </p>
                </div>

                {/* Invoices Count */}
                <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500 dark:text-slate-400">{lang === 'ar' ? 'عدد الفواتير الصادرة' : 'Invoices Issued'}</span>
                    <Receipt className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="font-mono text-2xl font-black text-gray-800 dark:text-slate-100">{reportStats.invoiceCount}</div>
                  <p className="text-[10px] text-gray-400">
                    {lang === 'ar' ? 'عدد المنشآت التي تم إصدار فواتير لها' : 'Number of client accounts billed'}
                  </p>
                </div>

                {/* Average Ticket */}
                <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500 dark:text-slate-400">{lang === 'ar' ? 'متوسط قيمة الفاتورة' : 'Average Invoice Value'}</span>
                    <TrendingUp className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="font-mono text-2xl font-black text-gray-800 dark:text-slate-100">{reportStats.averageInvoice.toFixed(2)} BHD</div>
                  <p className="text-[10px] text-gray-400">
                    {lang === 'ar' ? 'متوسط القيمة النقدية لكل فاتورة صالحة' : 'Average financial return per invoice'}
                  </p>
                </div>
              </div>

              {/* Grouped Lists (Grid) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Category Grouping */}
                <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm space-y-4 text-right">
                  <h5 className="font-bold text-xs text-gray-800 dark:text-slate-200 border-b border-gray-100 dark:border-slate-700 pb-2 flex items-center justify-start gap-1.5">
                    <Tag className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{lang === 'ar' ? 'التصنيف بحسب الأقسام' : 'Revenue by Department'}</span>
                  </h5>
                  <div className="space-y-3">
                    {Object.keys(reportStats.categoryGroup).length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-xs">{lang === 'ar' ? 'لا توجد بيانات متاحة.' : 'No category data.'}</div>
                    ) : (
                      Object.entries(reportStats.categoryGroup).map(([cat, val]) => {
                        const pct = reportStats.totalSales > 0 ? (val / reportStats.totalSales) * 100 : 0;
                        const displayCat = cat;
                        return (
                          <div key={cat} className="space-y-1">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span className="text-gray-700 dark:text-slate-300">{displayCat}</span>
                              <span className="font-mono text-gray-900 dark:text-slate-100">{val.toFixed(1)} BHD ({pct.toFixed(0)}%)</span>
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-red-600 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 2. Subcategory Grouping */}
                <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm space-y-4 text-right">
                  <h5 className="font-bold text-xs text-gray-800 dark:text-slate-200 border-b border-gray-100 dark:border-slate-700 pb-2 flex items-center justify-start gap-1.5">
                    <Grid className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{lang === 'ar' ? 'التصنيف بحسب فروع الأقسام' : 'Revenue by Subcategory'}</span>
                  </h5>
                  <div className="space-y-3">
                    {Object.keys(reportStats.subcategoryGroup).length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-xs">{lang === 'ar' ? 'لا توجد بيانات متاحة.' : 'No subcategory data.'}</div>
                    ) : (
                      Object.entries(reportStats.subcategoryGroup).slice(0, 5).map(([sub, val]) => {
                        const pct = reportStats.totalSales > 0 ? (val / reportStats.totalSales) * 100 : 0;
                        return (
                          <div key={sub} className="space-y-1">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span className="text-gray-700 dark:text-slate-300">{sub}</span>
                              <span className="font-mono text-gray-900 dark:text-slate-100">{val.toFixed(1)} BHD ({pct.toFixed(0)}%)</span>
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-red-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 3. Members Performance Grouping */}
                <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm space-y-4 text-right">
                  <h5 className="font-bold text-xs text-gray-800 dark:text-slate-200 border-b border-gray-100 dark:border-slate-700 pb-2 flex items-center justify-start gap-1.5">
                    <User className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{lang === 'ar' ? 'أداء المبيعات للأعضاء' : 'Revenue by Member'}</span>
                  </h5>
                  <div className="space-y-3">
                    {Object.keys(reportStats.memberGroup).length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-xs">{lang === 'ar' ? 'لا توجد مبيعات منسوبة لأعضاء.' : 'No member sales.'}</div>
                    ) : (
                      Object.entries(reportStats.memberGroup).map(([member, val]) => {
                        const pct = reportStats.totalSales > 0 ? (val / reportStats.totalSales) * 100 : 0;
                        return (
                          <div key={member} className="space-y-1">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span className="text-gray-700 dark:text-slate-300">@{member}</span>
                              <span className="font-mono text-gray-900 dark:text-slate-100">{val.toFixed(1)} BHD ({pct.toFixed(0)}%)</span>
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-red-400 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ────────────────── INVOICE MODAL ────────────────── */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-700 space-y-5 text-right relative overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-3">
              <h4 className="font-black text-base text-gray-900 dark:text-slate-100">
                {editingInvoice 
                  ? (lang === 'ar' ? `تعديل فاتورة ${editingInvoice.invoiceNumber}` : `Edit Invoice ${editingInvoice.invoiceNumber}`) 
                  : (lang === 'ar' ? 'إصدار فاتورة مبيعات جديدة' : 'Issue New Sales Invoice')}
              </h4>
              <button
                type="button"
                onClick={() => setShowInvoiceModal(false)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-500"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="space-y-4">
              {/* Invoice Number - Readonly */}
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'رقم الفاتورة (يولد آلياً)' : 'Invoice Number (Auto-Generated)'}
                </label>
                <input
                  type="text"
                  value={invoiceForm.invoiceNumber}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-500 dark:text-slate-400 rounded-xl text-xs outline-none font-mono"
                  disabled
                  required
                />
              </div>

              {/* Toggle Custom vs Registered Business */}
              <div className="flex justify-between items-center gap-4 bg-gray-50 dark:bg-slate-900 p-2.5 rounded-xl border border-gray-100 dark:border-slate-800">
                <span className="text-xs font-bold text-gray-700 dark:text-slate-300">
                  {lang === 'ar' ? 'هل المنشأة مسجلة بالدليل؟' : 'Is business in the directory?'}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setInvoiceForm({ ...invoiceForm, isCustomBusiness: false, businessId: '', businessName: '', contactPhone: '' })}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${!invoiceForm.isCustomBusiness ? 'bg-red-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border border-gray-150'}`}
                  >
                    {lang === 'ar' ? 'نعم (مسجلة)' : 'Yes (Registered)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceForm({ ...invoiceForm, isCustomBusiness: true, businessId: '', businessName: '', contactPhone: '' })}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${invoiceForm.isCustomBusiness ? 'bg-red-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border border-gray-150'}`}
                  >
                    {lang === 'ar' ? 'منشأة جديدة غير مسجلة' : 'New Custom Business'}
                  </button>
                </div>
              </div>

              {/* Business details */}
              {!invoiceForm.isCustomBusiness ? (
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'اختر المنشأة المسجلة' : 'Select Registered Business'}
                  </label>
                  
                  {/* Selected Business Display or Search Activator */}
                  <div 
                    onClick={() => setIsBusinessDropdownOpen(!isBusinessDropdownOpen)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-xl text-xs flex justify-between items-center cursor-pointer hover:border-red-400 select-none"
                  >
                    <span className={invoiceForm.businessName ? 'font-bold text-gray-800 dark:text-slate-200' : 'text-gray-400'}>
                      {invoiceForm.businessName || (lang === 'ar' ? '-- اضغط للبحث واختيار منشأة --' : '-- Click to search & choose business --')}
                    </span>
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>

                  {isBusinessDropdownOpen && (
                    <>
                      {/* Invisible backdrop to click away and close dropdown */}
                      <div 
                        className="fixed inset-0 z-40 bg-transparent" 
                        onClick={() => setIsBusinessDropdownOpen(false)}
                      />
                      
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-60 animate-fadeIn">
                        {/* Search Input */}
                        <div className="p-2 border-b border-gray-150 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 flex items-center gap-2">
                          <Search className="h-4 w-4 text-gray-400 shrink-0" />
                          <input
                            type="text"
                            value={businessSearchQuery}
                            onChange={e => setBusinessSearchQuery(e.target.value)}
                            placeholder={lang === 'ar' ? 'اكتب اسم المنشأة أو الهاتف للبحث...' : 'Type name or phone to search...'}
                            className="w-full bg-transparent border-none text-xs outline-none text-right text-gray-800 dark:text-slate-100"
                            dir="rtl"
                            autoFocus
                            onClick={(e) => e.stopPropagation()} // Prevent closing dropdown on input click
                          />
                        </div>
                        
                        {/* Businesses List */}
                        <div className="overflow-y-auto divide-y divide-gray-100 dark:divide-slate-700 max-h-44 text-right">
                          {filteredBusinessesForInvoice.length === 0 ? (
                            <div className="p-3 text-center text-xs text-gray-400">
                              {lang === 'ar' ? 'لا توجد منشأة تطابق بحثك' : 'No matching businesses'}
                            </div>
                          ) : (
                            filteredBusinessesForInvoice.map((b: any) => (
                              <div
                                key={b.id}
                                onClick={() => {
                                  setInvoiceForm({
                                    ...invoiceForm,
                                    businessId: b.id,
                                    businessName: b.nameAr,
                                    contactPhone: b.phone || '',
                                  });
                                  setBusinessSearchQuery('');
                                  setIsBusinessDropdownOpen(false);
                                }}
                                className="p-2.5 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer text-xs flex justify-between items-center transition-colors"
                              >
                                <div className="text-right">
                                  <span className="font-bold text-gray-800 dark:text-slate-200 block">{b.nameAr}</span>
                                  {b.category && (
                                    <span className="text-[10px] text-gray-400 block">
                                      {categories.find((c: any) => c.id === b.category) 
                                        ? (lang === 'ar' 
                                            ? categories.find((c: any) => c.id === b.category).titleAr 
                                            : categories.find((c: any) => c.id === b.category).titleEn)
                                        : b.category}
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono text-[10px] text-gray-500 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                  {b.phone || (lang === 'ar' ? 'بلا هاتف' : 'No Phone')}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-1">
                      {lang === 'ar' ? 'اسم المنشأة الجديدة' : 'Custom Business Name'}
                    </label>
                    <input
                      type="text"
                      value={invoiceForm.businessName}
                      onChange={e => setInvoiceForm({ ...invoiceForm, businessName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-400 text-right"
                      placeholder="أدخل اسم المحل أو المنشأة..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-1">
                      {lang === 'ar' ? 'رقم هاتف التواصل' : 'Contact Phone Number'}
                    </label>
                    <input
                      type="text"
                      value={invoiceForm.contactPhone}
                      onChange={e => setInvoiceForm({ ...invoiceForm, contactPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-400 ltr text-left"
                      placeholder="مثال: 97333000000"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Product and Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'المنتج / الباقة الإعلانية' : 'Ad Package Product'}
                  </label>
                  <select
                    value={invoiceForm.productId}
                    onChange={e => setInvoiceForm({ ...invoiceForm, productId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-400"
                    required
                  >
                    {salesProducts.map((p: any) => {
                      const foundUnit = units.find(u => u.id === p.unit);
                      const unitName = foundUnit
                        ? (lang === 'ar' ? foundUnit.nameAr : foundUnit.nameEn)
                        : (p.unit === 'day' ? (lang === 'ar' ? 'يوم' : 'day') : p.unit === 'week' ? (lang === 'ar' ? 'أسبوع' : 'week') : (lang === 'ar' ? 'شهر' : 'month'));
                      return (
                        <option key={p.id} value={p.id}>{p.nameAr} ({p.price} BHD / {unitName})</option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'تاريخ بداية الإعلان' : 'Ad Start Date'}
                  </label>
                  <input
                    type="date"
                    value={invoiceForm.startDate}
                    onChange={e => setInvoiceForm({ ...invoiceForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-400 font-mono text-center"
                    required
                  />
                </div>
              </div>

              {/* Discount & Notes fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-1 flex justify-between items-center">
                    <span>{lang === 'ar' ? 'نسبة الخصم (%)' : 'Discount (%)'}</span>
                    {!isAdmin && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold">
                        {lang === 'ar' ? `الأقصى: ${maxDiscountPercent}%` : `Max: ${maxDiscountPercent}%`}
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={invoiceForm.discountPercent}
                    onChange={e => {
                      const val = Math.min(100, Math.max(0, Number(e.target.value)));
                      setInvoiceForm({ ...invoiceForm, discountPercent: val });
                    }}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-400 font-mono text-center font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'ملاحظات إضافية للفاتورة' : 'Invoice Additional Notes'}
                  </label>
                  <textarea
                    value={invoiceForm.notes}
                    onChange={e => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                    rows={1}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-400 text-right resize-none"
                    placeholder={lang === 'ar' ? 'شروط خاصة، تفاصيل الدفع...' : 'E.g. special terms, payment info...'}
                  />
                </div>
              </div>

              {/* Quantity (Duration) & live calculation */}
              {invoiceForm.productId && (
                (() => {
                  const product = salesProducts.find((p: any) => p.id === invoiceForm.productId);
                  if (!product) return null;

                  const calculatedEnd = calculateEndDate(invoiceForm.startDate, product.unit, invoiceForm.quantity);
                  const subtotalVal = product.price * invoiceForm.quantity;
                  const discountPct = Number(invoiceForm.discountPercent) || 0;
                  const discountAmt = Number((subtotalVal * (discountPct / 100)).toFixed(2));
                  const netTotal = Number((subtotalVal - discountAmt).toFixed(2));

                  const foundUnit = units.find(u => u.id === product.unit);
                  const unitSuffixAr = foundUnit
                    ? foundUnit.nameAr
                    : (product.unit === 'day' ? 'أيام' : product.unit === 'week' ? 'أسابيع' : 'أشهر');
                  const unitSuffixEn = foundUnit
                    ? foundUnit.nameEn
                    : (product.unit + 's');

                  return (
                    <div className="bg-gray-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-gray-150 dark:border-slate-700 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center items-center">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 mb-1">
                            {lang === 'ar' ? `الكمية (${unitSuffixAr})` : `Quantity / Duration (${unitSuffixEn})`}
                          </label>
                          <input
                            type="number"
                            value={invoiceForm.quantity}
                            min={1}
                            onChange={e => setInvoiceForm({ ...invoiceForm, quantity: Math.max(1, Number(e.target.value)) })}
                            className="w-20 mx-auto px-2 py-1.5 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-850 rounded-xl text-xs font-bold text-center outline-none"
                            required
                          />
                        </div>

                        <div>
                          <span className="block text-[10px] font-bold text-gray-400 mb-1">{lang === 'ar' ? 'تاريخ نهاية الإعلان (آلي)' : 'Auto-Calculated End Date'}</span>
                          <strong className="text-xs font-mono font-bold text-gray-700 dark:text-slate-300 block">{calculatedEnd}</strong>
                        </div>

                        <div>
                          <span className="block text-[10px] font-bold text-gray-400 mb-1">{lang === 'ar' ? 'المجموع الأصلي' : 'Original Subtotal'}</span>
                          <span className={`text-xs font-mono font-bold block ${discountPct > 0 ? 'line-through text-gray-400' : 'text-gray-700 dark:text-slate-300'}`}>{subtotalVal} BHD</span>
                        </div>
                      </div>

                      {discountPct > 0 && (
                        <div className="flex justify-between items-center bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-lg text-xs font-bold">
                          <span>{lang === 'ar' ? `الخصم المطبق (${discountPct}%):` : `Discount Applied (${discountPct}%):`}</span>
                          <span className="font-mono">-{discountAmt.toFixed(2)} BHD</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center border-t border-gray-150 dark:border-slate-700 pt-2 text-right">
                        <span className="text-xs font-bold text-gray-600 dark:text-slate-300">
                          {lang === 'ar' ? 'المبلغ النهائي المستحق الدفع:' : 'Final Net Total Due:'}
                        </span>
                        <strong className="text-base font-mono text-red-600 dark:text-red-400 font-black">
                          {netTotal.toFixed(2)} BHD
                        </strong>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Submit Buttons */}
              <div className="flex gap-2 justify-end pt-3 border-t border-gray-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 text-xs font-bold rounded-xl"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  {lang === 'ar' ? 'حفظ وإصدار الفاتورة' : 'Save & Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────── PRODUCT MODAL ────────────────── */}
      {showProductModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-700 space-y-4 text-right">
            <h4 className="font-bold text-base text-gray-900 dark:text-slate-100 border-b border-gray-100 dark:border-slate-700 pb-2">
              {editingProduct ? (lang === 'ar' ? 'تعديل باقة إعلانية' : 'Edit Ad Package') : (lang === 'ar' ? 'إضافة باقة إعلانية جديدة' : 'Add New Ad Package')}
            </h4>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'اسم الباقة الإعلانية (بالعربية)' : 'Package Name (Arabic)'}
                </label>
                <input
                  type="text"
                  value={productForm.nameAr}
                  onChange={e => setProductForm({ ...productForm, nameAr: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-400 text-right"
                  placeholder="مثال: إعلان مثبت أعلى الموقع"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'اسم الباقة الإعلانية (بالإنجليزية)' : 'Package Name (English)'}
                </label>
                <input
                  type="text"
                  value={productForm.nameEn}
                  onChange={e => setProductForm({ ...productForm, nameEn: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-400 ltr text-left"
                  placeholder="e.g. Top Banner Premium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'السعر (بالدينار البحريني)' : 'Price (BHD)'}
                  </label>
                  <input
                    type="number"
                    value={productForm.price}
                    min={1}
                    onChange={e => setProductForm({ ...productForm, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-xl text-xs font-mono font-bold text-center outline-none focus:ring-1 focus:ring-red-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'دورة القياس / الوحدة' : 'Billing Unit Cycle'}
                  </label>
                  <select
                    value={productForm.unit}
                    onChange={e => setProductForm({ ...productForm, unit: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-400"
                    required
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {lang === 'ar' ? u.nameAr : u.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-3 border-t border-gray-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 text-xs font-bold rounded-xl"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  {lang === 'ar' ? 'حفظ المنتج' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────── CUSTOM UNIT MODAL ────────────────── */}
      {showUnitModal && (
        <div className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-700 space-y-4 text-right" dir="rtl">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-2">
              <h4 className="font-bold text-base text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <Settings className="h-5 w-5 text-red-600" />
                <span>{lang === 'ar' ? 'إدارة وحدات القياس' : 'Manage Units of Measure'}</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowUnitModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-gray-100 dark:divide-slate-700">
              {/* Existing list */}
              <div className="space-y-3">
                <h5 className="font-bold text-xs text-gray-500 dark:text-slate-400">
                  {lang === 'ar' ? 'وحدات القياس المتوفرة:' : 'Available Units:'}
                </h5>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {units.map((u) => (
                    <div key={u.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-slate-900/40 rounded-xl text-xs border border-gray-100 dark:border-slate-800">
                      <div>
                        <span className="font-bold text-gray-800 dark:text-slate-200 block">
                          {lang === 'ar' ? u.nameAr : u.nameEn}
                        </span>
                        <span className="text-[9px] text-gray-400 block font-mono mt-0.5">
                          {lang === 'ar'
                            ? `المدة: ${u.days === 0 ? 'بلا انتهاء' : `${u.days} يوم`}`
                            : `Duration: ${u.days === 0 ? 'No end' : `${u.days} d`}`}
                        </span>
                      </div>
                      {!['day', 'week', 'month'].includes(u.id) && (
                        <button
                          onClick={() => {
                            const updated = units.filter(item => item.id !== u.id);
                            setUnits(updated);
                            localStorage.setItem('bh_sales_units', JSON.stringify(updated));
                          }}
                          className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                          title={lang === 'ar' ? 'حذف الوحدة' : 'Delete unit'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Add form */}
              <form onSubmit={handleCreateUnit} className="space-y-3 pt-3 md:pt-0 md:pl-4">
                <h5 className="font-bold text-xs text-red-600">
                  {lang === 'ar' ? 'إضافة وحدة جديدة:' : 'Add New Unit:'}
                </h5>
                
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'الاسم بالعربية' : 'Name (Arabic)'}
                  </label>
                  <input
                    type="text"
                    value={unitForm.nameAr}
                    onChange={e => setUnitForm({ ...unitForm, nameAr: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-400 text-right"
                    placeholder="سنة، باقة، نقرة..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-600 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'الاسم بالإنجليزية' : 'Name (English)'}
                  </label>
                  <input
                    type="text"
                    value={unitForm.nameEn}
                    onChange={e => setUnitForm({ ...unitForm, nameEn: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-400 ltr text-left"
                    placeholder="Year, Pack, Click..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-600 dark:text-slate-300 mb-1 col-span-2">
                    {lang === 'ar' ? 'المدة بالأيام (لحساب التواريخ)' : 'Duration in Days'}
                  </label>
                  <input
                    type="number"
                    value={unitForm.days}
                    min={0}
                    onChange={e => setUnitForm({ ...unitForm, days: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-400 font-mono"
                    required
                  />
                  <p className="text-[9px] text-gray-400 mt-0.5">
                    {lang === 'ar' ? 'اكتب 0 للمفتوح / غير المربوط بزمن' : '0 for open-ended or non-timed packages'}
                  </p>
                </div>

                <div className="pt-2 text-left">
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                  >
                    {lang === 'ar' ? 'إضافة الوحدة' : 'Add Unit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
