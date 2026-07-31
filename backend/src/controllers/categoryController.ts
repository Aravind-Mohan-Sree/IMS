import { Request, Response } from 'express';
import { CategoryModel } from '../models/Category';

export const getCategories = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: 'User not authenticated' });

    const { search, page, limit } = req.query;
    const query: any = { userId };

    if (search && typeof search === 'string' && search.trim() !== '') {
      query.name = { $regex: search.trim(), $options: 'i' };
    }

    const categories = await CategoryModel.find(query).sort({ createdAt: -1, _id: -1 });

    if (page && req.query.all !== 'true') {
      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(String(limit), 10) || 15));
      const total = categories.length;
      const totalPages = Math.ceil(total / limitNum);
      const paginated = categories.slice((pageNum - 1) * limitNum, pageNum * limitNum);

      return res.json({
        categories: paginated,
        total,
        page: pageNum,
        totalPages,
        hasMore: pageNum < totalPages
      });
    }

    return res.json(categories);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch categories' });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: 'User not authenticated' });

    const { name, description } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ message: 'Category name must be at least 2 characters' });
    }
    if (name.trim().length > 30) {
      return res.status(400).json({ message: 'Category name cannot exceed 30 characters' });
    }
    if (description && typeof description === 'string' && description.trim().length > 150) {
      return res.status(400).json({ message: 'Description cannot exceed 150 characters' });
    }

    const cleanName = name.trim();
    const existing = await CategoryModel.findOne({
      userId,
      name: { $regex: `^${cleanName}$`, $options: 'i' }
    });

    if (existing) {
      return res.status(400).json({ message: 'Category with this name already exists' });
    }

    const category = await CategoryModel.create({
      userId,
      name: cleanName,
      description: description ? description.trim() : ''
    });

    return res.status(201).json(category);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to create category' });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { name, description } = req.body;

    const current = await CategoryModel.findOne({ _id: id, userId });
    if (!current) return res.status(404).json({ message: 'Category not found' });

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ message: 'Category name must be at least 2 characters' });
      }
      if (name.trim().length > 30) {
        return res.status(400).json({ message: 'Category name cannot exceed 30 characters' });
      }
      const cleanName = name.trim();
      const existing = await CategoryModel.findOne({
        userId,
        _id: { $ne: id },
        name: { $regex: `^${cleanName}$`, $options: 'i' }
      });
      if (existing) {
        return res.status(400).json({ message: 'Category with this name already exists' });
      }
    }
    if (description !== undefined && typeof description === 'string' && description.trim().length > 150) {
      return res.status(400).json({ message: 'Description cannot exceed 150 characters' });
    }

    const updated = await CategoryModel.findOneAndUpdate(
      { _id: id, userId },
      {
        $set: {
          ...(name !== undefined && { name: name.trim() }),
          ...(description !== undefined && { description: description.trim() })
        }
      },
      { new: true }
    );

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to update category' });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const deleted = await CategoryModel.findOneAndDelete({ _id: id, userId });
    if (!deleted) return res.status(404).json({ message: 'Category not found' });
    return res.json({ message: 'Category deleted successfully', id });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to delete category' });
  }
};
