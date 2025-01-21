import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  firebaseId: { type: String, required: false },
  username: { type: String, required: false },
  email: { type: String, required: false },
},{timestamps:true});

export default mongoose.model('User',userSchema);
