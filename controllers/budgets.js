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

    // Tìm ngân sách theo userId và budgetId
    const budget = await Budget.findOne({ _id: budgetId, userId });
    if (!budget) {
      return res.status(404).json({ message: 'Không tìm thấy ngân sách' });
    }

    const startBudgetDate = new Date(budget.startBudgetDate).toISOString();
    const endBudgetDate = new Date(budget.endBudgetDate).toISOString();

    // Lấy danh sách chi tiêu trong khoảng thời gian ngân sách
    const expenses = await Expense.find({
      userId,
      budgetId, // Lọc theo budgetId để lấy đúng chi tiêu cho ngân sách này
      date: { $gte: startBudgetDate, $lte: endBudgetDate },
    });

    const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.totalAmount || 0), 0);

    const response = {
      message: totalExpenses > budget.amount ? 'Tổng chi tiêu đã vượt quá ngân sách' : 'Chi tiêu trong giới hạn',
      totalExpenses,
      budgetAmount: budget.amount,
      startBudgetDate,
      endBudgetDate,
      expenses,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Lỗi khi kiểm tra ngân sách:', error);
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
};
