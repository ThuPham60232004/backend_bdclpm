import Budget from '../models/budgets.js';
import Expense from '../models/expenses.js';
export const createBudget = async (req, res) => {
  try {
    const budget = new Budget(req.body);
    const savedBudget = await budget.save();
    res.status(200).json(savedBudget);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
export const getAllBudgets = async (req, res) => {
  try {
    const budgets = await Budget.find();
    res.status(200).json(budgets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getBudgetById = async (req, res) => {
  try {
    const { userId } = req.params;  
    const budgets = await Budget.find({ userId }).populate('userId');
    if (!budgets || budgets.length === 0) {
      return res.status(404).json({ message: 'Budgets not found for this user' });
    }
    res.status(200).json(budgets); 
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateBudgetById = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedBudget = await Budget.findByIdAndUpdate(id, req.body, { new: true }).populate('userId');
    if (!updatedBudget) return res.status(404).json({ message: 'Budget not found' });
    res.status(200).json(updatedBudget);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
export const deleteBudgetById = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBudget = await Budget.findByIdAndDelete(id);
    if (!deletedBudget) return res.status(404).json({ message: 'Budget not found' });
    res.status(200).json({ message: 'Budget deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const checkBudgetLimit = async (req, res) => {
  try {
    const { userId, budgetId } = req.params;
    const budget = await Budget.findOne({ _id: budgetId, userId });
    if (!budget) {
      return res.status(404).json({ message: 'Không tìm thấy ngân sách' });
    }
    const budgetStart = new Date(budget.startBudgetDate);
    const budgetEnd = new Date(budget.endBudgetDate);
    const expenses = await Expense.find({
      userId,
      date: { $gte: budgetStart, $lte: budgetEnd },
    });
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.totalAmount || 0), 0);
    const status = totalExpenses > budget.amount ? 'exceeded' : 'within limit';
    return res.status(totalExpenses > budget.amount ? 400 : 200).json({
      message: totalExpenses > budget.amount ? 'Tổng chi tiêu đã vượt quá giới hạn ngân sách' : 'Chi tiêu nằm trong giới hạn ngân sách',
      budgetId: budget._id,
      startBudgetDate: budgetStart,
      endBudgetDate: budgetEnd,
      budgetAmount: budget.amount,
      totalExpenses,
      status,
      expenses, 
    });
  } catch (error) {
    console.error('Lỗi khi kiểm tra giới hạn ngân sách:', error);
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
};
