import express from 'express';
import {
  createIncome,
  getAllIncomes,
  getIncomeByUserId,
  updateIncomeById,
  deleteIncomeById,
  getUserIncomeChart
  
} from '../controllers/income.js';

const router = express.Router();

router.post('/', createIncome);
router.get('/', getAllIncomes);
router.get('/:userId', getIncomeByUserId);
router.put('/:id', updateIncomeById);
router.delete('/:id', deleteIncomeById);
router.get('/incomes-chart/:userId', getUserIncomeChart);
export default router;
