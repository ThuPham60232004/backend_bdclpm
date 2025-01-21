import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  storeName: { type: String, required: false },
  totalAmount: { type: Number, required: false },
  description: { type: String, required: false },
  date: { type: Date, required: false },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
},{timestamps:true});

export default mongoose.model('Expense',expenseSchema);