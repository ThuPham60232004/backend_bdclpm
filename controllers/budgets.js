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
    const { userId } = req.params;

    // Lấy tất cả ngân sách của user
    const budgets = await Budget.find({ userId });

    if (!budgets.length) {
      return res.status(404).json({ message: 'Không tìm thấy ngân sách' });
    }

    let totalBudget = 0;
    let totalExpenses = 0;
    let expensesList = [];
    let startBudgetDate = budgets[0].startBudgetDate;
    let endBudgetDate = budgets[0].endBudgetDate;

    for (const budget of budgets) {
      const start = new Date(budget.startBudgetDate);
      const end = new Date(budget.endBudgetDate);

      // Cập nhật ngày bắt đầu và kết thúc cho phản hồi API
      if (start < startBudgetDate) startBudgetDate = start;
      if (end > endBudgetDate) endBudgetDate = end;

      // Lấy chi tiêu trong khoảng thời gian của ngân sách
      const expenses = await Expense.find({
        userId,
        date: { $gte: start, $lte: end },
      });

      totalBudget += budget.amount;
      totalExpenses += expenses.reduce((sum, expense) => sum + (expense.totalAmount || 0), 0);
      expensesList.push(...expenses);
    }

    const response = {
      message: totalExpenses > totalBudget ? 'Tổng chi tiêu đã vượt quá ngân sách' : 'Chi tiêu trong giới hạn',
      totalExpenses,
      totalBudget,
      startBudgetDate: startBudgetDate.toISOString(),
      endBudgetDate: endBudgetDate.toISOString(),
      expenses: expensesList,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Lỗi khi kiểm tra ngân sách:', error);
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
};

