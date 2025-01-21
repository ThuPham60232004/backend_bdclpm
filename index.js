import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import userRoutes from './routes/user.js';
import expensesRoutes from './routes/expenses.js';
import categoryRoutes from './routes/categories.js';
import budgetRoutes from './routes/budgets.js';
dotenv.config();

const app = express();

app.use(cors());
app.use(cookieParser());
app.use(express.json());

app.use('/api/users', userRoutes); 
app.use('/api/expenses', expensesRoutes); 
app.use('/api/categories', categoryRoutes);
app.use('/api/budgets', budgetRoutes);

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

const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.DB);
    console.log('Kết nối với cơ sở dữ liệu MongoDB thành công!');
  } catch (err) {
    console.log('Lỗi kết nối với cơ sở dữ liệu MongoDB:', err);
    throw err;
  }
};

mongoose.connection.on('error', (err) => {
  console.log(`Lỗi kết nối cơ sở dữ liệu MongoDB: ${err.message}`);
});
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  connectMongoDB();
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
