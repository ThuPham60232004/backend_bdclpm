import express from 'express';
import { processTextWithGemini,handleIncomeCommand } from '../controllers/gemini.js';

const router = express.Router();

router.post('/process', processTextWithGemini);
router.post('/income-command', handleIncomeCommand);
export default router;
