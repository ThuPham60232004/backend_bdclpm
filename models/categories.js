import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: false },
  icon:{type:String,required:true}
},{timestamps:true});

export default mongoose.model('Category', categorySchema);