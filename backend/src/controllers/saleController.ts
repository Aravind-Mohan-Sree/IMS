import { Request, Response } from 'express';
import { SaleModel, ISaleItem } from '../models/Sale';
import { ItemModel } from '../models/Item';
import { CustomerModel } from '../models/Customer';

export const getSales = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: 'User not authenticated' });

    const { startDate, endDate, customerId } = req.query;

    const query: any = { userId };
    if (startDate && typeof startDate === 'string' && startDate.trim() !== '') {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        query.saleDate = { ...query.saleDate, $gte: start };
      }
    }
    if (endDate && typeof endDate === 'string' && endDate.trim() !== '') {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        query.saleDate = { ...query.saleDate, $lte: end };
      }
    }
    if (customerId && typeof customerId === 'string' && customerId !== 'all') {
      query.customerId = customerId;
    }

    const sales = await SaleModel.find(query).sort({ saleDate: -1, createdAt: -1, _id: -1 });
    return res.json(sales);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch sales' });
  }
};

export const getSaleById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const sale = await SaleModel.findOne({ userId, $or: [{ _id: id }, { invoiceNo: id }] });
    if (!sale) return res.status(404).json({ message: 'Sale invoice not found' });
    return res.json(sale);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch sale' });
  }
};

export const createSale = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: 'User not authenticated' });

    const {
      customerId,
      customerName,
      customerMobile,
      date,
      saleDate,
      items,
      discount = 0,
      tax = 0,
      paymentMethod = 'Cash',
      notes = ''
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required for recording a sale' });
    }

    const disc = Number(discount) || 0;
    if (disc < 0) {
      return res.status(400).json({ message: 'Discount cannot be negative' });
    }

    const taxAmt = Number(tax) || 0;
    if (taxAmt < 0) {
      return res.status(400).json({ message: 'Tax amount cannot be negative' });
    }

    const saleItems: ISaleItem[] = [];
    let calculatedSubtotal = 0;

    for (const itemInput of items) {
      if (!itemInput.itemId) {
        return res.status(400).json({ message: 'Invalid item selection' });
      }

      const invItem = await ItemModel.findOne({ _id: itemInput.itemId, userId });
      if (!invItem) {
        return res.status(400).json({ message: `Item with ID ${itemInput.itemId} not found in inventory` });
      }

      const qty = Number(itemInput.quantity);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ message: `Invalid quantity for item ${invItem.name}` });
      }

      if (invItem.quantity < qty) {
        return res.status(400).json({
          message: `Insufficient stock for "${invItem.name}". Available: ${invItem.quantity}, Requested: ${qty}`
        });
      }

      const unitPrice = itemInput.unitPrice !== undefined ? Number(itemInput.unitPrice) : invItem.price;
      if (isNaN(unitPrice) || unitPrice <= 0) {
        return res.status(400).json({ message: `Invalid unit price for item ${invItem.name}` });
      }

      const lineTotal = unitPrice * qty;
      calculatedSubtotal += lineTotal;

      saleItems.push({
        itemId: invItem.id || invItem._id.toString(),
        itemName: invItem.name,
        sku: invItem.sku,
        quantity: Math.floor(qty),
        unitPrice: Number(unitPrice.toFixed(2)),
        totalPrice: Number(lineTotal.toFixed(2))
      });
    }

    const subtotal = Number(calculatedSubtotal.toFixed(2));
    if (disc > subtotal) {
      return res.status(400).json({ message: `Discount (₹${disc}) cannot exceed subtotal (₹${subtotal})` });
    }

    const totalAmount = Number((subtotal - disc + taxAmt).toFixed(2));

    // Require Customer for Credit Sales
    if (paymentMethod === 'Credit' && !customerId) {
      return res.status(400).json({ message: 'Credit sales require selecting a registered Customer Account' });
    }

    // Generate Invoice Number for this user
    const salesCount = await SaleModel.countDocuments({ userId });
    const newInvoiceNo = `INV-${1001 + salesCount}`;
    const inputDate = saleDate || date;
    const parsedSaleDate = inputDate ? new Date(inputDate) : new Date();
    const validSaleDate = isNaN(parsedSaleDate.getTime()) ? new Date() : parsedSaleDate;

    let finalCustomerName = customerName || 'Cash Customer';
    let targetCustomerId = customerId || null;

    if (targetCustomerId) {
      const cust = await CustomerModel.findOne({ _id: targetCustomerId, userId });
      if (cust) {
        finalCustomerName = cust.name;
      } else {
        targetCustomerId = null;
      }
    }

    // Update inventory stock
    for (const item of saleItems) {
      await ItemModel.findOneAndUpdate(
        { _id: item.itemId, userId },
        { $inc: { quantity: -item.quantity } }
      );
    }

    // Update customer current balance if assigned and sale is on Credit
    if (targetCustomerId && paymentMethod === 'Credit') {
      await CustomerModel.findOneAndUpdate(
        { _id: targetCustomerId, userId },
        { $inc: { currentBalance: totalAmount } }
      );
    }

    const newSale = await SaleModel.create({
      userId,
      invoiceNo: newInvoiceNo,
      customerId: targetCustomerId,
      customerName: finalCustomerName,
      customerMobile: customerMobile || '',
      saleDate: validSaleDate,
      items: saleItems,
      subtotal,
      discount: disc,
      tax: taxAmt,
      totalAmount,
      paymentMethod,
      notes: notes && typeof notes === 'string' ? notes.trim() : ''
    });

    return res.status(201).json(newSale);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Error recording sale' });
  }
};
