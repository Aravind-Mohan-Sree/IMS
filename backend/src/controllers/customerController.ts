import mongoose from 'mongoose';
import { Request, Response } from 'express';
import { CustomerModel } from '../models/Customer';
import { PaymentModel } from '../models/Payment';
import { SaleModel } from '../models/Sale';

const indianPhoneRegex = /^(\+91[\-\s]?)?[0-9]{10}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: 'User not authenticated' });

    const { search } = req.query;

    const query: any = { userId };
    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.trim();
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { mobile: { $regex: q, $options: 'i' } },
        { address: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ];
    }

    const customers = await CustomerModel.find(query).sort({ createdAt: -1, _id: -1 });

    const isValidUserHex = mongoose.Types.ObjectId.isValid(userId);
    const userObjId = isValidUserHex ? new mongoose.Types.ObjectId(userId) : null;
    const userMatch = userObjId ? { $in: [userId, userObjId] } : userId;

    // Aggregate Total Credit Sales per customer for this user with exact ObjectId casting
    const creditSales = await SaleModel.aggregate([
      {
        $match: {
          userId: userMatch,
          paymentMethod: 'Credit'
        }
      },
      {
        $group: {
          _id: { $toString: '$customerId' },
          totalCredit: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Aggregate Total Debt Payments per customer for this user with exact ObjectId casting
    const payments = await PaymentModel.aggregate([
      {
        $match: {
          userId: userMatch
        }
      },
      {
        $group: {
          _id: { $toString: '$customerId' },
          totalPaid: { $sum: '$amount' }
        }
      }
    ]);

    const creditMap: Record<string, number> = {};
    creditSales.forEach(s => { creditMap[s._id] = s.totalCredit; });

    const payMap: Record<string, number> = {};
    payments.forEach(p => { payMap[p._id] = p.totalPaid; });

    const computedCustomers = customers.map(c => {
      const cId = c._id.toString();
      const totalCredit = creditMap[cId] || 0;
      const totalPaid = payMap[cId] || 0;
      const realBalance = Number(((c.openingBalance || 0) + totalCredit - totalPaid).toFixed(2));

      const obj = c.toJSON();
      obj.currentBalance = realBalance;
      return obj;
    });

    if (req.query.page && req.query.all !== 'true') {
      const pageNum = Math.max(1, parseInt(String(req.query.page), 10) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(String(req.query.limit), 10) || 15));
      const total = computedCustomers.length;
      const totalPages = Math.ceil(total / limitNum);
      const paginated = computedCustomers.slice((pageNum - 1) * limitNum, pageNum * limitNum);
      return res.json({
        customers: paginated,
        total,
        page: pageNum,
        totalPages,
        hasMore: pageNum < totalPages
      });
    }

    return res.json(computedCustomers);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch customers' });
  }
};

export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    const customer = await CustomerModel.findOne({ _id: id, userId });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const cId = customer._id.toString();
    const creditSales = await SaleModel.aggregate([
      { $match: { userId, customerId: cId, paymentMethod: 'Credit' } },
      { $group: { _id: '$customerId', totalCredit: { $sum: '$totalAmount' } } }
    ]);
    const payments = await PaymentModel.aggregate([
      { $match: { userId, customerId: cId } },
      { $group: { _id: '$customerId', totalPaid: { $sum: '$amount' } } }
    ]);

    const totalCredit = creditSales[0]?.totalCredit || 0;
    const totalPaid = payments[0]?.totalPaid || 0;
    const realBalance = Number(((customer.openingBalance || 0) + totalCredit - totalPaid).toFixed(2));

    const obj = customer.toJSON();
    obj.currentBalance = realBalance;

    return res.json(obj);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch customer' });
  }
};

export const createCustomer = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: 'User not authenticated' });

    const { name, address, mobile, email, notes, openingBalance } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ message: 'Customer name must be at least 2 characters' });
    }
    if (name.trim().length > 40) {
      return res.status(400).json({ message: 'Customer name cannot exceed 40 characters' });
    }

    if (!mobile || typeof mobile !== 'string' || !indianPhoneRegex.test(mobile.trim())) {
      return res.status(400).json({ message: 'Valid 10-digit mobile number is required (e.g. +91 98765 43210)' });
    }
    if (mobile.trim().length > 15) {
      return res.status(400).json({ message: 'Mobile number cannot exceed 15 characters' });
    }

    if (email && typeof email === 'string' && email.trim() !== '') {
      const cleanEmail = email.trim().toLowerCase();
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ message: 'Invalid email address format' });
      }
      if (cleanEmail.length > 50) {
        return res.status(400).json({ message: 'Email cannot exceed 50 characters' });
      }
      const existingEmail = await CustomerModel.findOne({ userId, email: cleanEmail });
      if (existingEmail) {
        return res.status(400).json({ message: `Customer with email address "${cleanEmail}" already exists ("${existingEmail.name}")` });
      }
    }

    if (address && typeof address === 'string' && address.trim().length > 150) {
      return res.status(400).json({ message: 'Address cannot exceed 150 characters' });
    }

    if (notes && typeof notes === 'string' && notes.trim().length > 200) {
      return res.status(400).json({ message: 'Notes cannot exceed 200 characters' });
    }

    const opBal = openingBalance !== undefined ? Number(openingBalance) : 0;
    if (isNaN(opBal) || opBal < 0) {
      return res.status(400).json({ message: 'Opening balance cannot be negative' });
    }

    const existingMobile = await CustomerModel.findOne({ userId, mobile: mobile.trim() });
    if (existingMobile) {
      return res.status(400).json({ message: `Customer with mobile number "${mobile.trim()}" already exists ("${existingMobile.name}")` });
    }

    const newCustomer = await CustomerModel.create({
      userId,
      name: name.trim(),
      address: address && typeof address === 'string' ? address.trim() : '',
      mobile: mobile.trim(),
      email: email && typeof email === 'string' ? email.trim().toLowerCase() : '',
      notes: notes && typeof notes === 'string' ? notes.trim() : '',
      openingBalance: Number(opBal.toFixed(2)),
      currentBalance: Number(opBal.toFixed(2))
    });

    return res.status(201).json(newCustomer);
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Mobile number and email address must be unique' });
    }
    return res.status(500).json({ message: err.message || 'Error creating customer' });
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { name, address, mobile, email, notes, openingBalance } = req.body;

    const current = await CustomerModel.findOne({ _id: id, userId });
    if (!current) return res.status(404).json({ message: 'Customer not found' });

    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2)) {
      return res.status(400).json({ message: 'Customer name must be at least 2 characters' });
    }

    if (mobile !== undefined) {
      if (typeof mobile !== 'string' || !indianPhoneRegex.test(mobile.trim())) {
        return res.status(400).json({ message: 'Valid 10-digit mobile number is required' });
      }

      const existingMobile = await CustomerModel.findOne({ userId, mobile: mobile.trim(), _id: { $ne: id } });
      if (existingMobile) {
        return res.status(400).json({ message: `Mobile number "${mobile.trim()}" is already assigned to customer "${existingMobile.name}"` });
      }
    }

    if (email !== undefined && email !== null && typeof email === 'string' && email.trim() !== '') {
      const cleanEmail = email.trim().toLowerCase();
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ message: 'Invalid email address format' });
      }

      const existingEmail = await CustomerModel.findOne({ userId, email: cleanEmail, _id: { $ne: id } });
      if (existingEmail) {
        return res.status(400).json({ message: `Email address "${cleanEmail}" is already assigned to customer "${existingEmail.name}"` });
      }
    }

    const newOpBal = openingBalance !== undefined ? Number(openingBalance) : current.openingBalance;
    if (isNaN(newOpBal) || newOpBal < 0) {
      return res.status(400).json({ message: 'Opening balance cannot be negative' });
    }

    const updatedCustomer = await CustomerModel.findOneAndUpdate(
      { _id: id, userId },
      {
        $set: {
          ...(name !== undefined && { name: name.trim() }),
          ...(address !== undefined && { address: address.trim() }),
          ...(mobile !== undefined && { mobile: mobile.trim() }),
          ...(email !== undefined && { email: email.trim() }),
          ...(notes !== undefined && { notes: notes.trim() }),
          openingBalance: Number(newOpBal.toFixed(2))
        }
      },
      { new: true }
    );

    return res.json(updatedCustomer);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Error updating customer' });
  }
};

export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    const deleted = await CustomerModel.findOneAndDelete({ _id: id, userId });
    if (!deleted) return res.status(404).json({ message: 'Customer not found' });
    return res.json({ message: 'Customer deleted successfully', id });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Error deleting customer' });
  }
};

// Record Debt Payment Settlement
export const recordCustomerPayment = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { amount, date, paymentDate, paymentMethod = 'Cash', reference, notes } = req.body;

    const payAmount = Number(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ message: 'Payment amount must be greater than ₹0' });
    }

    const inputDate = paymentDate || date;
    const parsedPayDate = inputDate ? new Date(inputDate) : new Date();
    const validPayDate = isNaN(parsedPayDate.getTime()) ? new Date() : parsedPayDate;
    const payRef = reference && typeof reference === 'string' && reference.trim() !== '' ? reference.trim() : `REC-${Math.floor(1000 + Math.random() * 9000)}`;

    const customer = await CustomerModel.findOne({ _id: id, userId });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    // Create Payment Document
    const newPayment = await PaymentModel.create({
      userId,
      customerId: customer.id || customer._id.toString(),
      customerName: customer.name,
      amount: Number(payAmount.toFixed(2)),
      paymentDate: validPayDate,
      paymentMethod: paymentMethod || 'Cash',
      reference: payRef,
      notes: notes && typeof notes === 'string' ? notes.trim() : ''
    });

    return res.status(201).json({
      message: `Payment of ₹${payAmount.toFixed(2)} received for ${customer.name}`,
      payment: newPayment
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Error recording customer payment' });
  }
};
