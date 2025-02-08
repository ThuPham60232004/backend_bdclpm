import express from 'express';
import {
  createExpense,
  getAllExpenses,
  getExpenseById,
  updateExpenseById,
  deleteExpenseById,
  getExpensesByCategory,
  getUserExpenseChart,
  getFilteredExpenseChart,
  statistics
} from '../controllers/expenses.js';

const router = express.Router();

router.post('/', createExpense);
router.get('/', getAllExpenses);
router.get('/:userId', getExpenseById);
router.put('/:id', updateExpenseById);
router.delete('/:id', deleteExpenseById);
router.get('/category/:categoryId', getExpensesByCategory);
router.get('/expenses-chart/:userId', getUserExpenseChart);
router.get('/expenses-time/:userId', getFilteredExpenseChart);
router.get('/statistics/:userId', statistics);
export default router;
