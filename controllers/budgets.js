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

    // Tìm ngân sách của người dùng
    const budget = await Budget.findOne({ userId });
    if (!budget) {
      return res.status(404).json({ message: 'Không tìm thấy ngân sách cho người dùng này' });
    }

    // Chuyển đổi thời gian ngân sách sang ISO String để tránh vấn đề về timezone
    const startBudgetDate = new Date(budget.startBudgetDate).toISOString();
    const endBudgetDate = new Date(budget.endBudgetDate).toISOString();

    // Lấy danh sách chi tiêu của người dùng trong phạm vi thời gian ngân sách
    const expenses = await Expense.find({
      userId,
      date: { $gte: startBudgetDate, $lte: endBudgetDate },
    });

    // Tính tổng chi tiêu
    const totalExpenses = expenses.reduce((sum, expense) => {
      if (expense.totalAmount) {
        return sum + expense.totalAmount; // Cộng dồn chi tiêu nếu có giá trị
      }
      return sum;
    }, 0);

    // Kiểm tra xem tổng chi tiêu có vượt ngân sách không
    if (totalExpenses > budget.amount) {
      return res.status(400).json({
        message: 'Tổng chi tiêu đã vượt quá giới hạn ngân sách',
        totalExpenses,
        budgetAmount: budget.amount,
      });
    }

    // Nếu tổng chi tiêu không vượt quá ngân sách
    res.status(200).json({
      message: 'Chi tiêu nằm trong giới hạn ngân sách',
      totalExpenses,
      budgetAmount: budget.amount,
      expenses, // Trả về danh sách chi tiêu
    });
  } catch (error) {
    console.error('Lỗi khi kiểm tra giới hạn ngân sách:', error);
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
};
