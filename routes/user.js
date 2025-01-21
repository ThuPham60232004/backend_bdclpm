import express from 'express';
import { verifyToken,getAllUser } from '../controllers/user.js';

const router = express.Router();

router.post('/verify-token', verifyToken);
router.get('/', getAllUser);
export default router;
