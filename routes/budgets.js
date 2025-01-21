import express from 'express';
import {
  createBudget,
  getAllBudgets,
  getBudgetById,
  updateBudgetById,
  deleteBudgetById,
  checkBudgetLimit
} from '../controllers/budgets.js';

const router = express.Router();

router.post('/', createBudget);
router.get('/', getAllBudgets);
router.get('/:userId', getBudgetById);
router.put('/:id', updateBudgetById);
router.delete('/:id', deleteBudgetById);
router.get('/check-budget-limit/:userId', checkBudgetLimit); 

export default router;
