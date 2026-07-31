import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { ItemModel } from '../models/Item';
import { SaleModel } from '../models/Sale';
import { CustomerModel } from '../models/Customer';
import { PaymentModel } from '../models/Payment';
import { sendReportDocumentEmail } from '../services/emailService';

// --- Helper 1: Generate Excel Buffer ---
export const generateExcelBuffer = async (type: string, customerId?: string, startDate?: string, endDate?: string): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Inventory Management System';
  workbook.created = new Date();

  if (type === 'items') {
    const sheet = workbook.addWorksheet('Inventory Items');
    sheet.columns = [
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Price (₹)', key: 'price', width: 12 },
      { header: 'Cost Price (₹)', key: 'costPrice', width: 15 },
      { header: 'Total Retail Value (₹)', key: 'totalVal', width: 22 },
      { header: 'Min Stock Level', key: 'minStockLevel', width: 15 }
    ];

    const items = await ItemModel.find();

    items.forEach((item: any) => {
      sheet.addRow({
        sku: item.sku,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        price: item.price,
        costPrice: item.costPrice || 0,
        totalVal: Number((item.price * item.quantity).toFixed(2)),
        minStockLevel: item.minStockLevel
      });
    });

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
  } else if (type === 'items_report') {
    const sheet = workbook.addWorksheet('Category Valuation Breakdown');
    sheet.columns = [
      { header: 'Category', key: 'category', width: 22 },
      { header: 'Item Count', key: 'count', width: 14 },
      { header: 'Total Stock Qty', key: 'totalQty', width: 18 },
      { header: 'Total Stock Value (₹)', key: 'value', width: 22 }
    ];

    const items = await ItemModel.find();
    const catMap: Record<string, { count: number; totalQty: number; value: number }> = {};

    items.forEach((item: any) => {
      const cat = item.category || 'General';
      if (!catMap[cat]) catMap[cat] = { count: 0, totalQty: 0, value: 0 };
      catMap[cat].count += 1;
      catMap[cat].totalQty += item.quantity;
      catMap[cat].value += item.price * item.quantity;
    });

    Object.entries(catMap).forEach(([category, stats]) => {
      sheet.addRow({
        category,
        count: stats.count,
        totalQty: stats.totalQty,
        value: Number(stats.value.toFixed(2))
      });
    });

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F766E' } };
  } else if (type === 'customers') {
    const sheet = workbook.addWorksheet('Customer Directory');
    sheet.columns = [
      { header: 'Customer Name', key: 'name', width: 28 },
      { header: 'Mobile Number', key: 'mobile', width: 18 },
      { header: 'Address', key: 'address', width: 35 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Current Balance (₹)', key: 'currentBalance', width: 20 }
    ];

    const customers = await CustomerModel.find();
    const sales = await SaleModel.find();
    const payments = await PaymentModel.find();

    customers.forEach((c: any) => {
      const cId = c.id || c._id.toString();
      const totalCredit = sales
        .filter((s: any) => String(s.customerId) === cId && s.paymentMethod === 'Credit')
        .reduce((sum: number, s: any) => sum + s.totalAmount, 0);

      const totalPaid = payments
        .filter((p: any) => String(p.customerId) === cId)
        .reduce((sum: number, p: any) => sum + p.amount, 0);

      const realBalance = Number(((c.openingBalance || 0) + totalCredit - totalPaid).toFixed(2));

      sheet.addRow({
        name: c.name,
        mobile: c.mobile,
        address: c.address || '',
        email: c.email || '',
        currentBalance: realBalance
      });
    });

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } };
  } else if (type === 'sales') {
    const sheet = workbook.addWorksheet('Sales Report');
    sheet.columns = [
      { header: 'Invoice No', key: 'invoiceNo', width: 15 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Customer', key: 'customerName', width: 25 },
      { header: 'Payment Method', key: 'paymentMethod', width: 16 },
      { header: 'Subtotal (₹)', key: 'subtotal', width: 14 },
      { header: 'Discount (₹)', key: 'discount', width: 14 },
      { header: 'Tax (₹)', key: 'tax', width: 12 },
      { header: 'Total (₹)', key: 'totalAmount', width: 15 }
    ];

    let sales = await SaleModel.find();
    if (startDate && typeof startDate === 'string') {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) sales = sales.filter((s: any) => new Date(s.saleDate || s.createdAt) >= start);
    }
    if (endDate && typeof endDate === 'string') {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        sales = sales.filter((s: any) => new Date(s.saleDate || s.createdAt) <= end);
      }
    }

    sales.forEach((sale: any) => {
      const sDate = sale.saleDate ? new Date(sale.saleDate).toLocaleString('en-IN') : String(sale.createdAt || '');
      sheet.addRow({
        invoiceNo: sale.invoiceNo,
        date: sDate,
        customerName: sale.customerName,
        paymentMethod: sale.paymentMethod,
        subtotal: sale.subtotal,
        discount: sale.discount,
        tax: sale.tax,
        totalAmount: sale.totalAmount
      });
    });

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F766E' } };
  } else if (type === 'ledger' && customerId) {
    const customer = await CustomerModel.findById(customerId);

    const sheet = workbook.addWorksheet('Customer Ledger');

    sheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Reference', key: 'reference', width: 16 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Debit / Billed (₹)', key: 'debit', width: 18 },
      { header: 'Credit / Paid (₹)', key: 'credit', width: 18 },
      { header: 'Running Balance (₹)', key: 'balance', width: 22 }
    ];

    const custSales = await SaleModel.find({ customerId });
    const custPayments = await PaymentModel.find({ customerId });

    const entries: any[] = [];

    custSales.forEach((s: any) => {
      const isCredit = s.paymentMethod === 'Credit';
      const sDate = s.saleDate ? new Date(s.saleDate).toLocaleDateString('en-IN') : '';
      entries.push({
        date: sDate,
        reference: s.invoiceNo,
        type: 'Sale',
        isCredit,
        description: `Invoice ${s.invoiceNo} (${s.items.length} items - ${s.paymentMethod})`,
        debit: s.totalAmount,
        credit: isCredit ? 0 : s.totalAmount,
        createdAtDate: new Date(s.saleDate || s.createdAt)
      });
    });

    custPayments.forEach((p: any) => {
      const pDate = p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN') : '';
      entries.push({
        date: pDate,
        reference: p.reference || 'REC-PMT',
        type: 'Payment',
        isCredit: false,
        description: `Payment Received (${p.paymentMethod}) ${p.notes ? '- ' + p.notes : ''}`,
        debit: 0,
        credit: p.amount,
        createdAtDate: new Date(p.paymentDate || p.createdAt)
      });
    });

    entries.sort((a, b) => a.createdAtDate.getTime() - b.createdAtDate.getTime());

    let runningBalance = customer?.openingBalance || 0;

    if (customer && customer.openingBalance > 0) {
      sheet.addRow({
        date: customer.createdAt ? String(customer.createdAt).split('T')[0] : new Date().toISOString().split('T')[0],
        reference: 'OP-BAL',
        description: 'Opening Balance carried forward',
        debit: customer.openingBalance,
        credit: 0,
        balance: customer.openingBalance
      });
    }

    entries.forEach(e => {
      if (e.type === 'Sale' && e.isCredit) {
        runningBalance += e.debit;
      } else if (e.type === 'Payment') {
        runningBalance -= e.credit;
      }

      sheet.addRow({
        date: e.date,
        reference: e.reference,
        description: e.description,
        debit: e.debit > 0 ? e.debit : 0,
        credit: e.credit > 0 ? e.credit : 0,
        balance: Number(runningBalance.toFixed(2))
      });
    });

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4338CA' } };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

// --- Helper 2: Generate PDF Buffer ---
export const generatePDFBuffer = async (type: string, customerId?: string, saleId?: string): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      doc.fontSize(20).text('INVENTORY MANAGEMENT SYSTEM', { align: 'center' });
      doc.fontSize(10).fillColor('#666666').text('Official Business Document & Report', { align: 'center' });
      doc.moveDown(1.5);

      if (type === 'invoice' && saleId) {
        const sale = await SaleModel.findOne({ $or: [{ _id: saleId }, { invoiceNo: saleId }] });

        if (sale) {
          const sDate = sale.saleDate ? new Date(sale.saleDate).toLocaleString('en-IN') : String(sale.createdAt || '');
          doc.fillColor('#000000').fontSize(16).text(`SALES INVOICE: ${sale.invoiceNo}`, { underline: true });
          doc.fontSize(10).text(`Date: ${sDate}`);
          doc.text(`Customer Name: ${sale.customerName}`);
          if (sale.customerMobile) doc.text(`Contact: ${sale.customerMobile}`);
          doc.text(`Payment Method: ${sale.paymentMethod}`);
          doc.moveDown();

          doc.fontSize(11).font('Helvetica-Bold').text('Item Name', 30, doc.y, { width: 220 });
          doc.text('Qty', 260, doc.y - 12, { width: 50 });
          doc.text('Price', 320, doc.y - 12, { width: 80 });
          doc.text('Total', 420, doc.y - 12, { width: 100 });
          doc.font('Helvetica').moveDown(0.5);

          sale.items.forEach((item: any) => {
            const y = doc.y;
            doc.fontSize(10).text(item.itemName, 30, y, { width: 220 });
            doc.text(String(item.quantity), 260, y, { width: 50 });
            doc.text(`₹${item.unitPrice.toFixed(2)}`, 320, y, { width: 80 });
            doc.text(`₹${item.totalPrice.toFixed(2)}`, 420, y, { width: 100 });
            doc.moveDown(0.5);
          });

          doc.moveDown();
          doc.font('Helvetica-Bold').text(`Subtotal: ₹${sale.subtotal.toFixed(2)}`, { align: 'right' });
          if (sale.discount > 0) doc.text(`Discount: -₹${sale.discount.toFixed(2)}`, { align: 'right' });
          if (sale.tax > 0) doc.text(`Tax: +₹${sale.tax.toFixed(2)}`, { align: 'right' });
          doc.fontSize(13).text(`Total Amount: ₹${sale.totalAmount.toFixed(2)}`, { align: 'right' });
        }
      } else if (type === 'items') {
        doc.fillColor('#000000').fontSize(16).text('INVENTORY ITEMS REPORT', { underline: true });
        doc.fontSize(10).text(`Generated On: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)`);
        doc.moveDown();

        const items = await ItemModel.find();

        items.forEach((item: any) => {
          if (doc.y > 750) doc.addPage();
          doc.fontSize(11).font('Helvetica-Bold').text(`${item.name} (${item.sku})`, 30, doc.y);
          doc.fontSize(9).font('Helvetica').text(`Category: ${item.category} | Qty: ${item.quantity} ${item.unit} | Selling Price: ₹${item.price.toFixed(2)} | Cost: ₹${(item.costPrice || 0).toFixed(2)} | Stock Value: ₹${(item.price * item.quantity).toFixed(2)}`);
          doc.moveDown(0.5);
        });
      } else if (type === 'items_report') {
        doc.fillColor('#000000').fontSize(16).text('ITEMS VALUATION & STOCK ANALYTICS REPORT', { underline: true });
        doc.fontSize(10).text(`Generated On: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)`);
        doc.moveDown();

        const items = await ItemModel.find();

        let totalVal = 0;
        let totalCost = 0;
        const catMap: Record<string, { count: number; totalQty: number; value: number }> = {};

        items.forEach((i: any) => {
          const cat = i.category || 'General';
          if (!catMap[cat]) catMap[cat] = { count: 0, totalQty: 0, value: 0 };
          catMap[cat].count += 1;
          catMap[cat].totalQty += i.quantity;
          catMap[cat].value += i.price * i.quantity;

          totalVal += i.price * i.quantity;
          totalCost += (i.costPrice || 0) * i.quantity;
        });

        doc.fontSize(12).font('Helvetica-Bold').text('FINANCIAL VALUATION SUMMARY');
        doc.fontSize(10).font('Helvetica').text(`Total Retail Valuation: ₹${totalVal.toFixed(2)}`);
        doc.text(`Total Cost Valuation: ₹${totalCost.toFixed(2)}`);
        doc.text(`Estimated Profit Potential: ₹${(totalVal - totalCost).toFixed(2)}`);
        doc.moveDown(1.5);

        doc.fontSize(12).font('Helvetica-Bold').text('CATEGORY BREAKDOWN SUMMARY');
        doc.moveDown(0.5);

        Object.entries(catMap).forEach(([cat, stats]) => {
          if (doc.y > 750) doc.addPage();
          doc.fontSize(10).font('Helvetica-Bold').text(`Category: ${cat}`);
          doc.fontSize(9).font('Helvetica').text(`Item Types: ${stats.count} | Total Qty: ${stats.totalQty} units | Retail Valuation: ₹${stats.value.toFixed(2)}`);
          doc.moveDown(0.5);
        });
      } else if (type === 'customers') {
        doc.fillColor('#000000').fontSize(16).text('CUSTOMER DIRECTORY STATEMENT', { underline: true });
        doc.fontSize(10).text(`Generated On: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)`);
        doc.moveDown();

        const customers = await CustomerModel.find();
        const sales = await SaleModel.find();
        const payments = await PaymentModel.find();

        customers.forEach((c: any) => {
          if (doc.y > 750) doc.addPage();

          const cId = c.id || c._id.toString();
          const totalCredit = sales
            .filter((s: any) => String(s.customerId) === cId && s.paymentMethod === 'Credit')
            .reduce((sum: number, s: any) => sum + s.totalAmount, 0);

          const totalPaid = payments
            .filter((p: any) => String(p.customerId) === cId)
            .reduce((sum: number, p: any) => sum + p.amount, 0);

          const realBalance = Number(((c.openingBalance || 0) + totalCredit - totalPaid).toFixed(2));

          doc.fontSize(11).font('Helvetica-Bold').text(`${c.name}`, 30, doc.y);
          doc.fontSize(9).font('Helvetica').text(`Mobile: ${c.mobile} | Email: ${c.email || 'N/A'} | Address: ${c.address || 'N/A'}`);
          doc.fontSize(10).font('Helvetica-Bold').text(`Current Outstanding Balance: ₹${realBalance.toFixed(2)}`);
          doc.moveDown(0.6);
        });
      } else if (type === 'sales') {
        doc.fillColor('#000000').fontSize(16).text('SALES SUMMARY REPORT', { underline: true });
        doc.fontSize(10).text(`Generated On: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)`);
        doc.moveDown();

        const sales = await SaleModel.find();

        sales.forEach((sale: any) => {
          if (doc.y > 750) doc.addPage();
          const sDate = sale.saleDate ? new Date(sale.saleDate).toLocaleString('en-IN') : String(sale.createdAt || '');
          doc.fontSize(11).font('Helvetica-Bold').text(`${sale.invoiceNo} | Date: ${sDate} | Customer: ${sale.customerName}`);
          doc.fontSize(9).font('Helvetica').text(`Payment: ${sale.paymentMethod} | Subtotal: ₹${sale.subtotal.toFixed(2)} | Tax: ₹${sale.tax.toFixed(2)} | Total: ₹${sale.totalAmount.toFixed(2)}`);
          doc.moveDown(0.5);
        });
      } else if (type === 'ledger' && customerId) {
        const customer = await CustomerModel.findById(customerId);

        const sales = await SaleModel.find({ customerId });

        const payments = await PaymentModel.find({ customerId });

        const totalCreditSales = sales
          .filter((s: any) => s.paymentMethod === 'Credit')
          .reduce((sum: number, s: any) => sum + s.totalAmount, 0);

        const totalPayments = payments
          .reduce((sum: number, p: any) => sum + p.amount, 0);

        const opBal = customer?.openingBalance || 0;
        const currentOutstandingBalance = Number((opBal + totalCreditSales - totalPayments).toFixed(2));

        doc.fillColor('#000000').fontSize(16).text(`CUSTOMER LEDGER STATEMENT`, { underline: true });
        doc.fontSize(11).text(`Customer: ${customer ? customer.name : 'Unknown'}`);
        if (customer?.mobile) doc.text(`Mobile: ${customer.mobile}`);
        if (customer?.address) doc.text(`Address: ${customer.address}`);
        doc.fontSize(10).text(`Opening Balance: ₹${opBal.toFixed(2)}`);
        doc.fontSize(11).font('Helvetica-Bold').text(`Current Outstanding Balance: ₹${currentOutstandingBalance.toFixed(2)}`);
        doc.moveDown();

        const entries: any[] = [];

        sales.forEach((s: any) => {
          const isCredit = s.paymentMethod === 'Credit';
          const sDate = s.saleDate ? new Date(s.saleDate).toLocaleDateString('en-IN') : '';
          entries.push({
            date: sDate,
            reference: s.invoiceNo,
            type: 'Sale',
            isCredit,
            description: `Invoice ${s.invoiceNo} (${s.items.length} items - ${s.paymentMethod})`,
            debit: s.totalAmount,
            credit: isCredit ? 0 : s.totalAmount,
            createdAtDate: new Date(s.saleDate || s.createdAt)
          });
        });

        payments.forEach((p: any) => {
          const pDate = p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN') : '';
          entries.push({
            date: pDate,
            reference: p.reference || 'REC-PMT',
            type: 'Payment',
            isCredit: false,
            description: `Payment Received (${p.paymentMethod}) ${p.notes ? '- ' + p.notes : ''}`,
            debit: 0,
            credit: p.amount,
            createdAtDate: new Date(p.paymentDate || p.createdAt)
          });
        });

        entries.sort((a, b) => a.createdAtDate.getTime() - b.createdAtDate.getTime());

        let runningBalance = opBal;

        entries.forEach((e: any) => {
          if (doc.y > 750) doc.addPage();
          if (e.type === 'Sale' && e.isCredit) {
            runningBalance += e.debit;
          } else if (e.type === 'Payment') {
            runningBalance -= e.credit;
          }

          doc.fontSize(10).font('Helvetica-Bold').text(`${e.date} - ${e.reference} (${e.type})`);
          doc.fontSize(9).font('Helvetica').text(`${e.description} | Debit: ₹${e.debit.toFixed(2)} | Credit: ₹${e.credit.toFixed(2)} | Running Balance: ₹${runningBalance.toFixed(2)}`);
          doc.moveDown(0.4);
        });
      } else {
        doc.text('IMS Document');
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
};

// 1. Export Excel Endpoint
export const exportExcel = async (req: Request, res: Response) => {
  try {
    const { type, customerId, startDate, endDate } = req.query;
    const excelBuffer = await generateExcelBuffer(String(type || 'items'), customerId ? String(customerId) : undefined, startDate ? String(startDate) : undefined, endDate ? String(endDate) : undefined);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${type || 'Report'}.xlsx"`);
    return res.send(excelBuffer);
  } catch (err: any) {
    return res.status(500).json({ message: 'Error exporting Excel spreadsheet' });
  }
};

// 2. Export PDF Endpoint
export const exportPDF = async (req: Request, res: Response) => {
  try {
    const { type, customerId, saleId } = req.query;
    const pdfBuffer = await generatePDFBuffer(String(type || 'items'), customerId ? String(customerId) : undefined, saleId ? String(saleId) : undefined);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${type || 'report'}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err: any) {
    return res.status(500).json({ message: 'Error generating PDF document' });
  }
};

// 3. Export Email Endpoint (Anti-Spam Optimized + Attachments)
export const exportEmail = async (req: Request, res: Response) => {
  try {
    const { email, subject, message, reportType, customerId, saleId, startDate, endDate, format } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      return res.status(400).json({ message: 'Valid recipient email address is required' });
    }

    const typeStr = reportType || 'items';
    const fileFormat = format === 'excel' ? 'excel' : 'pdf';
    const attachmentFileName = `IMS_${typeStr.toUpperCase()}_Document.${fileFormat === 'excel' ? 'xlsx' : 'pdf'}`;

    // Generate binary document attachment
    let attachmentBuffer: Buffer;
    if (fileFormat === 'excel') {
      attachmentBuffer = await generateExcelBuffer(typeStr, customerId, startDate, endDate);
    } else {
      attachmentBuffer = await generatePDFBuffer(typeStr, customerId, saleId);
    }

    const base64Attachment = attachmentBuffer.toString('base64');
    const emailSubject = subject || `Your ${typeStr.toUpperCase()} Document`;
    const plainTextMessage = message || `Please find attached the requested ${typeStr} report generated from our Inventory Management System.`;

    const sent = await sendReportDocumentEmail(
      email.trim(),
      emailSubject,
      plainTextMessage,
      attachmentFileName,
      base64Attachment
    );

    if (sent) {
      return res.json({
        success: true,
        message: `Email report successfully sent to ${email}`,
        recipient: email,
        subject: emailSubject
      });
    } else {
      return res.status(500).json({ message: 'Failed to send email. Check BREVO_API_KEY configuration.' });
    }
  } catch (err: any) {
    console.error('Export Email Error:', err);
    return res.status(500).json({ message: err.message || 'Error processing email delivery request' });
  }
};
