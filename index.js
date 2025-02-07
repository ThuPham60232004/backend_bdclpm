import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import Redis from 'ioredis';

// Import routes
import userRoutes from './routes/user.js';
import expensesRoutes from './routes/expenses.js';
import categoryRoutes from './routes/categories.js';
import budgetRoutes from './routes/budgets.js';
import incomeRoutes from './routes/income.js';
import geminiRoutes from './routes/gemini.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(cookieParser());
app.use(express.json());

// Kết nối Redis
const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || '',
});

redis.on('connect', () => console.log('✅ Kết nối Redis thành công!'));
redis.on('error', (err) => console.error('❌ Lỗi kết nối Redis:', err));

// Kết nối MongoDB
const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.DB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Kết nối MongoDB thành công!');
  } catch (err) {
    console.log('❌ Lỗi kết nối MongoDB:', err);
    throw err;
  }
};

mongoose.connection.on('error', (err) => {
  console.log(`❌ Lỗi MongoDB: ${err.message}`);
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/incomes', incomeRoutes);
app.use('/api/gemini', geminiRoutes);

// Middleware xử lý lỗi
app.use((err, req, res, next) => {
  const errorStatus = err.status || 500;
  const errorMessage = err.message || 'Đã xảy ra lỗi!';
  return res.status(errorStatus).json({
    success: false,
    status: errorStatus,
    message: errorMessage,
    stack: err.stack,
  });
});

// Lắng nghe cổng server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  connectMongoDB();
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
});
