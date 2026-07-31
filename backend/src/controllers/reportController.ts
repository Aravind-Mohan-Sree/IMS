import mongoose from 'mongoose';
import { Request, Response } from 'express';
import { SaleModel } from '../models/Sale';
import { ItemModel } from '../models/Item';
import { CustomerModel } from '../models/Customer';
import { PaymentModel } from '../models/Payment';

export const getSalesReport = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: 'User not authenticated' });

    const { startDate, endDate, search } = req.query;

    // Fetch all sales for authenticated user
    const sales = await SaleModel.find({ userId }).sort({ saleDate: -1, createdAt: -1, _id: -1 });

    let periodSales = sales;

    if (startDate && typeof startDate === 'string' && startDate.trim() !== '') {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        start.setHours(0, 0, 0, 0);
        const startTime = start.getTime();
        periodSales = periodSales.filter(s => {
          const dt = new Date(s.saleDate || (s as any).createdAt || (s as any).date);
          return !isNaN(dt.getTime()) && dt.getTime() >= startTime;
        });
      }
    }

    if (endDate && typeof endDate === 'string' && endDate.trim() !== '') {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        const endTime = end.getTime();
        periodSales = periodSales.filter(s => {
          const dt = new Date(s.saleDate || (s as any).createdAt || (s as any).date);
          return !isNaN(dt.getTime()) && dt.getTime() <= endTime;
        });
      }
    }

    let filteredSales = periodSales;

    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      filteredSales = filteredSales.filter(s => {
        const matchInv = s.invoiceNo?.toLowerCase().includes(q);
        const matchCust = s.customerName?.toLowerCase().includes(q);
        const matchMethod = s.paymentMethod?.toLowerCase().includes(q);
        const matchItems = s.items?.some((it: any) =>
          it.itemName?.toLowerCase().includes(q) || it.sku?.toLowerCase().includes(q)
        );
        return matchInv || matchCust || matchMethod || matchItems;
      });
    }

    let totalRevenue = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let totalItemsSold = 0;

    const itemSalesMap: Record<string, { name: string; sku: string; quantity: number; revenue: number }> = {};

    for (const sale of periodSales) {
      totalRevenue += sale.totalAmount;
      totalDiscount += sale.discount || 0;
      totalTax += sale.tax || 0;

      for (const item of sale.items) {
        totalItemsSold += item.quantity;
        if (!itemSalesMap[item.itemId]) {
          itemSalesMap[item.itemId] = {
            name: item.itemName,
            sku: item.sku,
            quantity: 0,
            revenue: 0
          };
        }
        itemSalesMap[item.itemId].quantity += item.quantity;
        itemSalesMap[item.itemId].revenue += item.totalPrice;
      }
    }

    const topSellingItems = Object.values(itemSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const averageOrderValue = periodSales.length > 0 ? totalRevenue / periodSales.length : 0;

    const pageNum = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 15));

    const totalSalesCount = sales.length;
    const periodSalesCount = periodSales.length;
    const totalPages = Math.ceil(filteredSales.length / limitNum);
    const paginatedSales = filteredSales.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.json({
      summary: {
        totalSalesCount,
        periodSalesCount,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalDiscount: Number(totalDiscount.toFixed(2)),
        totalTax: Number(totalTax.toFixed(2)),
        totalItemsSold,
        averageOrderValue: Number(averageOrderValue.toFixed(2))
      },
      topSellingItems,
      sales: paginatedSales,
      page: pageNum,
      totalPages,
      hasMore: pageNum < totalPages
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Error generating sales report' });
  }
};

export const getItemsReport = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: 'User not authenticated' });

    const items = await ItemModel.find({ userId }).sort({ name: 1 });

    let totalQuantity = 0;
    let totalRetailValue = 0;
    let totalCostValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const categoryStats: Record<string, { count: number; totalQty: number; value: number }> = {};
    const lowStockItems: any[] = [];

    for (const item of items) {
      totalQuantity += item.quantity;
      const retailVal = item.price * item.quantity;
      const costVal = (item.costPrice || 0) * item.quantity;

      totalRetailValue += retailVal;
      totalCostValue += costVal;

      if (item.quantity === 0) {
        outOfStockCount++;
        lowStockItems.push(item);
      } else if (item.quantity <= item.minStockLevel) {
        lowStockCount++;
        lowStockItems.push(item);
      }

      const cat = item.category || 'Uncategorized';
      if (!categoryStats[cat]) {
        categoryStats[cat] = { count: 0, totalQty: 0, value: 0 };
      }
      categoryStats[cat].count += 1;
      categoryStats[cat].totalQty += item.quantity;
      categoryStats[cat].value += retailVal;
    }

    const categoryBreakdown = Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      count: stats.count,
      totalQty: stats.totalQty,
      value: Number(stats.value.toFixed(2))
    }));

    return res.json({
      summary: {
        totalItems: items.length,
        totalQuantity,
        totalRetailValue: Number(totalRetailValue.toFixed(2)),
        totalCostValue: Number(totalCostValue.toFixed(2)),
        potentialProfit: Number((totalRetailValue - totalCostValue).toFixed(2)),
        lowStockCount,
        outOfStockCount
      },
      categoryBreakdown,
      lowStockItems,
      items
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Error generating items report' });
  }
};

export const getCategoryValuation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: 'User not authenticated' });

    const { search, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit), 10) || 15));

    const items = await ItemModel.find({ userId });
    const categoryStats: Record<string, { count: number; totalQty: number; value: number }> = {};

    for (const item of items) {
      const cat = item.category || 'Uncategorized';
      if (!categoryStats[cat]) {
        categoryStats[cat] = { count: 0, totalQty: 0, value: 0 };
      }
      categoryStats[cat].count += 1;
      categoryStats[cat].totalQty += item.quantity;
      categoryStats[cat].value += item.price * item.quantity;
    }

    let categoryBreakdown = Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      count: stats.count,
      totalQty: stats.totalQty,
      value: Number(stats.value.toFixed(2))
    }));

    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      categoryBreakdown = categoryBreakdown.filter(c => c.category.toLowerCase().includes(q));
    }

    categoryBreakdown.sort((a, b) => b.value - a.value);

    const total = categoryBreakdown.length;
    const totalPages = Math.ceil(total / limitNum);
    const paginated = categoryBreakdown.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.json({
      categories: paginated,
      total,
      page: pageNum,
      totalPages,
      hasMore: pageNum < totalPages
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Error fetching category valuation' });
  }
};

export const getCustomerLedger = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { customerId } = req.params;
    if (!customerId) return res.status(400).json({ message: 'Customer ID is required' });

    const rawId = Array.isArray(customerId) ? customerId[0] : String(customerId);
    const isValidObjId = mongoose.Types.ObjectId.isValid(rawId);
    const custObjId = isValidObjId ? new mongoose.Types.ObjectId(rawId) : null;

    const customer = await CustomerModel.findOne({
      userId,
      $or: [
        { _id: rawId },
        ...(custObjId ? [{ _id: custObjId }] : [])
      ]
    });

    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const salesMatch: any[] = [
      { customerId: rawId },
      ...(custObjId ? [{ customerId: custObjId }] : [])
    ];

    const paymentsMatch: any[] = [
      { customerId: rawId },
      ...(custObjId ? [{ customerId: custObjId }] : [])
    ];

    const customerSales = await SaleModel.find({
      userId,
      $or: salesMatch
    }).sort({ saleDate: 1, createdAt: 1, _id: 1 });

    const customerPayments = await PaymentModel.find({
      userId,
      $or: paymentsMatch
    }).sort({ paymentDate: 1, createdAt: 1, _id: 1 });

    interface LedgerEntry {
      id: string;
      date: string;
      reference: string;
      type: 'Opening Balance' | 'Sale' | 'Payment';
      isCredit: boolean;
      description: string;
      debit: number;
      credit: number;
      balance: number;
      createdAtDate: Date;
      items?: any[];
      subtotal?: number;
      discount?: number;
      tax?: number;
      totalAmount?: number;
      paymentMethod?: string;
      notes?: string;
    }

    const rawEntries: LedgerEntry[] = [];

    // Push Opening Balance if present using customer's real creation date
    if (customer.openingBalance > 0) {
      const opDate = customer.createdAt ? new Date(customer.createdAt) : new Date('2026-01-01');
      rawEntries.push({
        id: 'ledger_op_' + (customer.id || customer._id),
        date: opDate.toISOString(),
        reference: 'OP-BAL',
        type: 'Opening Balance',
        isCredit: false,
        description: 'Opening Balance carried forward',
        debit: customer.openingBalance,
        credit: 0,
        balance: customer.openingBalance,
        createdAtDate: opDate
      });
    }

    for (const sale of customerSales) {
      const isCredit = sale.paymentMethod === 'Credit';
      const debit = sale.totalAmount;
      const credit = isCredit ? 0 : sale.totalAmount;
      const saleDt = sale.saleDate || sale.createdAt || new Date();

      rawEntries.push({
        id: 'ledger_sale_' + (sale.id || sale._id),
        date: saleDt.toISOString(),
        reference: sale.invoiceNo,
        type: 'Sale',
        isCredit,
        description: `Invoice ${sale.invoiceNo} - ${sale.items?.length || 0} items (${sale.paymentMethod})`,
        debit,
        credit,
        balance: 0,
        createdAtDate: new Date(saleDt),
        items: sale.items || [],
        subtotal: sale.subtotal,
        discount: sale.discount,
        tax: sale.tax,
        totalAmount: sale.totalAmount,
        paymentMethod: sale.paymentMethod,
        notes: sale.notes
      });
    }

    for (const pay of customerPayments) {
      const payDt = pay.paymentDate || pay.createdAt || new Date();
      rawEntries.push({
        id: 'ledger_pay_' + (pay.id || pay._id),
        date: payDt.toISOString(),
        reference: pay.reference || 'REC-PMT',
        type: 'Payment',
        isCredit: false,
        description: `Payment Received (${pay.paymentMethod}) ${pay.notes ? '- ' + pay.notes : ''}`,
        debit: 0,
        credit: pay.amount,
        balance: 0,
        createdAtDate: new Date(payDt),
        paymentMethod: pay.paymentMethod,
        notes: pay.notes
      });
    }

    // Event type priority order for same timestamp: Opening Balance (1) -> Sale (2) -> Payment (3)
    const typeOrderChronological: Record<string, number> = { 'Opening Balance': 1, 'Sale': 2, 'Payment': 3 };

    // Sort all transactions chronologically to calculate running balance
    rawEntries.sort((a, b) => {
      if (a.type === 'Opening Balance') return -1;
      if (b.type === 'Opening Balance') return 1;
      const diff = a.createdAtDate.getTime() - b.createdAtDate.getTime();
      if (diff !== 0) return diff;
      const prioA = typeOrderChronological[a.type] || 2;
      const prioB = typeOrderChronological[b.type] || 2;
      if (prioA !== prioB) return prioA - prioB;
      return String(a.id).localeCompare(String(b.id));
    });

    let runningBalance = customer.openingBalance || 0;
    for (const entry of rawEntries) {
      if (entry.type === 'Opening Balance') {
        entry.balance = Number((customer.openingBalance || 0).toFixed(2));
        continue;
      }
      if (entry.type === 'Sale' && entry.isCredit) {
        runningBalance += entry.debit;
      } else if (entry.type === 'Payment') {
        runningBalance -= entry.credit;
      }
      entry.balance = Number(runningBalance.toFixed(2));
    }

    const totalBilled = rawEntries.reduce((sum, entry) => sum + entry.debit, 0);
    const totalPaid = rawEntries.reduce((sum, entry) => sum + entry.credit, 0);

    // Latest-first order for UI presentation (Opening Balance at bottom)
    rawEntries.sort((a, b) => {
      if (a.type === 'Opening Balance') return 1;
      if (b.type === 'Opening Balance') return -1;
      const diff = b.createdAtDate.getTime() - a.createdAtDate.getTime();
      if (diff !== 0) return diff;
      const prioA = typeOrderChronological[a.type] || 2;
      const prioB = typeOrderChronological[b.type] || 2;
      if (prioA !== prioB) return prioB - prioA;
      return String(b.id).localeCompare(String(a.id));
    });

    const finalBalance = Number(runningBalance.toFixed(2));
    const customerObj = customer.toJSON ? customer.toJSON() : customer;
    customerObj.currentBalance = finalBalance;

    const searchStr = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const pageNum = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 15));

    let filteredEntries = rawEntries;
    if (searchStr) {
      filteredEntries = rawEntries.filter(entry => {
        const matchRef = entry.reference?.toLowerCase().includes(searchStr);
        const matchDesc = entry.description?.toLowerCase().includes(searchStr);
        const matchType = entry.type?.toLowerCase().includes(searchStr);
        const matchNotes = entry.notes?.toLowerCase().includes(searchStr);
        const matchItems = entry.items?.some((it: any) =>
          it.itemName?.toLowerCase().includes(searchStr) || it.sku?.toLowerCase().includes(searchStr)
        );
        return matchRef || matchDesc || matchType || matchNotes || matchItems;
      });
    }

    const searchEntriesCount = filteredEntries.length;
    const totalEntriesCount = rawEntries.length;
    const totalPages = Math.ceil(searchEntriesCount / limitNum);
    const paginatedLedger = filteredEntries.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.json({
      customer: customerObj,
      summary: {
        openingBalance: customer.openingBalance || 0,
        totalBilled: Number(totalBilled.toFixed(2)),
        totalPaid: Number(totalPaid.toFixed(2)),
        currentBalance: finalBalance,
        totalEntriesCount,
        searchEntriesCount
      },
      ledger: paginatedLedger,
      page: pageNum,
      totalPages,
      hasMore: pageNum < totalPages
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Error generating customer ledger' });
  }
};
