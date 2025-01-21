import mongoose from 'mongoose';

const budgetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  startBudgetDate: { type: Date, required: true },
  endBudgetDate: { type: Date, required: true },
},{timestamps:true});

export default mongoose.model('Budget', budgetSchema);
