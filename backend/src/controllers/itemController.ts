import { Request, Response } from 'express';
import { ItemModel } from '../models/Item';

export const getItems = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: 'User not authenticated' });

    const { search, category, status } = req.query;

    const query: any = { userId };

    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.trim();
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } }
      ];
    }

    if (category && typeof category === 'string' && category !== 'All') {
      query.category = { $regex: `^${category}$`, $options: 'i' };
    }

    let items = await ItemModel.find(query).sort({ createdAt: -1, _id: -1 });

    if (status === 'low') {
      items = items.filter(i => i.quantity <= i.minStockLevel && i.quantity > 0);
    } else if (status === 'out') {
      items = items.filter(i => i.quantity === 0);
    } else if (status === 'in') {
      items = items.filter(i => i.quantity > i.minStockLevel);
    }

    if (req.query.page && req.query.all !== 'true') {
      const pageNum = Math.max(1, parseInt(String(req.query.page), 10) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(String(req.query.limit), 10) || 15));
      const total = items.length;
      const totalPages = Math.ceil(total / limitNum);
      const paginated = items.slice((pageNum - 1) * limitNum, pageNum * limitNum);
      return res.json({
        items: paginated,
        total,
        page: pageNum,
        totalPages,
        hasMore: pageNum < totalPages
      });
    }

    return res.json(items);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch items' });
  }
};

export const getItemById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const item = await ItemModel.findOne({ _id: id, userId });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    return res.json(item);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Error loading item' });
  }
};

export const createItem = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: 'User not authenticated' });

    const { name, description, quantity, price, costPrice, sku, category, unit, minStockLevel } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ message: 'Item name must be at least 2 characters' });
    }
    if (name.trim().length > 50) {
      return res.status(400).json({ message: 'Item name cannot exceed 50 characters' });
    }

    if (description && typeof description === 'string' && description.trim().length > 200) {
      return res.status(400).json({ message: 'Item description cannot exceed 200 characters' });
    }

    if (sku && typeof sku === 'string' && sku.trim().length > 30) {
      return res.status(400).json({ message: 'SKU cannot exceed 30 characters' });
    }

    if (category && typeof category === 'string' && category.trim().length > 30) {
      return res.status(400).json({ message: 'Category cannot exceed 30 characters' });
    }

    if (unit && typeof unit === 'string' && unit.trim().length > 20) {
      return res.status(400).json({ message: 'Unit cannot exceed 20 characters' });
    }

    const numQty = Number(quantity);
    if (quantity === undefined || isNaN(numQty) || numQty < 0) {
      return res.status(400).json({ message: 'Quantity must be a non-negative number' });
    }

    const numPrice = Number(price);
    if (price === undefined || isNaN(numPrice) || numPrice <= 0) {
      return res.status(400).json({ message: 'Selling price must be greater than ₹0' });
    }

    const numCostPrice = costPrice !== undefined ? Number(costPrice) : numPrice * 0.7;
    if (isNaN(numCostPrice) || numCostPrice < 0) {
      return res.status(400).json({ message: 'Cost price cannot be negative' });
    }

    const itemSKU = sku && typeof sku === 'string' && sku.trim() !== '' ? sku.trim() : 'SKU-' + Math.floor(1000 + Math.random() * 9000);

    const existingSKU = await ItemModel.findOne({ userId, sku: itemSKU });
    if (existingSKU) {
      return res.status(400).json({ message: `SKU "${itemSKU}" is already assigned to item "${existingSKU.name}"` });
    }

    const newItem = await ItemModel.create({
      userId,
      name: name.trim(),
      sku: itemSKU,
      description: description && typeof description === 'string' ? description.trim() : '',
      quantity: Math.floor(numQty),
      price: Number(numPrice.toFixed(2)),
      costPrice: Number(numCostPrice.toFixed(2)),
      category: category && typeof category === 'string' ? category.trim() : 'General',
      unit: unit && typeof unit === 'string' ? unit.trim() : 'pcs',
      minStockLevel: minStockLevel !== undefined ? Math.max(0, Number(minStockLevel) || 0) : 5
    });

    return res.status(201).json(newItem);
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'SKU code must be unique' });
    }
    return res.status(500).json({ message: err.message || 'Error creating item' });
  }
};

export const updateItem = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { name, description, quantity, price, costPrice, sku, category, unit, minStockLevel } = req.body;

    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2)) {
      return res.status(400).json({ message: 'Item name must be at least 2 characters' });
    }

    if (sku && typeof sku === 'string' && sku.trim() !== '') {
      const existingSKU = await ItemModel.findOne({ userId, sku: sku.trim(), _id: { $ne: id } });
      if (existingSKU) {
        return res.status(400).json({ message: `SKU "${sku.trim()}" is already assigned to item "${existingSKU.name}"` });
      }
    }

    if (quantity !== undefined && (isNaN(Number(quantity)) || Number(quantity) < 0)) {
      return res.status(400).json({ message: 'Quantity must be a non-negative number' });
    }

    if (price !== undefined && (isNaN(Number(price)) || Number(price) <= 0)) {
      return res.status(400).json({ message: 'Selling price must be greater than ₹0' });
    }

    if (costPrice !== undefined && (isNaN(Number(costPrice)) || Number(costPrice) < 0)) {
      return res.status(400).json({ message: 'Cost price cannot be negative' });
    }

    const updatedItem = await ItemModel.findOneAndUpdate(
      { _id: id, userId },
      {
        $set: {
          ...(name !== undefined && { name: name.trim() }),
          ...(sku !== undefined && { sku: sku.trim() }),
          ...(description !== undefined && { description: description.trim() }),
          ...(quantity !== undefined && { quantity: Math.floor(Number(quantity)) }),
          ...(price !== undefined && { price: Number(Number(price).toFixed(2)) }),
          ...(costPrice !== undefined && { costPrice: Number(Number(costPrice).toFixed(2)) }),
          ...(category !== undefined && { category: category.trim() }),
          ...(unit !== undefined && { unit: unit.trim() }),
          ...(minStockLevel !== undefined && { minStockLevel: Math.max(0, Number(minStockLevel) || 0) })
        }
      },
      { new: true }
    );

    if (!updatedItem) return res.status(404).json({ message: 'Item not found' });
    return res.json(updatedItem);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Error updating item' });
  }
};

export const deleteItem = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const deleted = await ItemModel.findOneAndDelete({ _id: id, userId });
    if (!deleted) return res.status(404).json({ message: 'Item not found' });
    return res.json({ message: 'Item deleted successfully', id });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Error deleting item' });
  }
};
