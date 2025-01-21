import Expense from '../models/expenses.js';
import mongoose from 'mongoose';
export const createExpense = async (req, res) => {
  try {
    const expense = new Expense(req.body);
    const savedExpense = await expense.save();
    res.status(201).json(savedExpense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find().populate('userId categoryId');
    res.status(200).json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getExpenseById = async (req, res) => {
  try {
    const { userId } = req.params; 
    const expenses = await Expense.find({ userId }).populate('categoryId', 'name icon'); 
    
    if (!expenses || expenses.length === 0) {
      return res.status(404).json({ message: 'No expenses found for this user' });
    }
    
    res.status(200).json(expenses); 
  } catch (error) {
    console.error('Error fetching expenses:', error); 
    res.status(500).json({ message: 'Server error' });
  }
};
export const updateExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedExpense = await Expense.findByIdAndUpdate(id, req.body, { new: true }).populate('userId categoryId');
    if (!updatedExpense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.status(200).json(updatedExpense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedExpense = await Expense.findByIdAndDelete(id);
    if (!deletedExpense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.status(200).json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const getExpensesByCategory = async (req, res) => {
  const { categoryId } = req.params;

  try {
    const expenses = await Expense.find({ categoryId }).populate('categoryId', 'name icon'); 
    if (!expenses || expenses.length === 0) {
      return res.status(404).json({ message: 'No expenses found for this category' });
    }

    res.status(200).json(expenses);
  } catch (error) {
    console.error('Error fetching expenses by category:', error);
    res.status(500).json({ message: 'Error fetching expenses by category', error: error.message });
  }
};
export const getUserExpenseChart = async (req, res) => {
  const { userId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid userId' });
    }

    const expenses = await Expense.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } }, // Sử dụng "new"
      {
        $group: {
          _id: '$categoryId',
          totalAmount: { $sum: '$totalAmount' },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      {
        $project: {
          _id: 0,
          categoryName: '$category.name',
          totalAmount: 1,
        },
      },
    ]);

    if (!expenses.length) {
      return res.status(404).json({ success: false, message: 'No expenses found' });
    }

    res.status(200).json({ success: true, data: expenses });
  } catch (error) {
    console.error('Error fetching user expenses:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
export const getFilteredExpenseChart = async (req, res) => {
  const { userId } = req.params;
  const { startDate, endDate } = req.query; 

  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid userId' });
    }

    const expenses = await Expense.aggregate([
      { 
        $match: { 
          userId: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } 
        }
      },
      {
        $project: {
          categoryId: 1,
          totalAmount: 1,
          createdAt: { $month: '$createdAt' },
        },
      },
      {
        $group: {
          _id: { categoryId: '$categoryId', month: '$createdAt' },
          totalAmount: { $sum: '$totalAmount' },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id.categoryId',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      {
        $project: {
          _id: 0,
          categoryName: '$category.name',
          month: '$_id.month',
          totalAmount: 1,
        },
      },
      {
        $sort: { month: 1 },
      },
    ]);

    if (!expenses.length) {
      return res.status(404).json({ success: false, message: 'No expenses found' });
    }

    res.status(200).json({ success: true, data: expenses });
  } catch (error) {
    console.error('Error fetching filtered expense chart:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
