import mongoose from 'mongoose';

const incomeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: false },
  date: { type: Date, required: true },
},{timestamps: true});

export default mongoose.model('Income', incomeSchema);
