import firebaseAdmin from '../config/firebaseConfig.js';
import User from '../models/user.js';

export const verifyToken = async (req, res) => {
  const idToken = req.body.token;

  try {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    const firebaseId = decodedToken.uid;
    let user = await User.findOne({ firebaseId });
    if (!user) {
      user = new User({
        firebaseId: firebaseId,
        username: decodedToken.name || 'No Name',
        email: decodedToken.email,
      });
      await user.save();
    }
    res.json(user);
  } catch (error) {
    res.status(401).json({
      error: 'Lỗi xác thực',
      message: error.message,
    });
  }
};

export const getAllUser = async (req, res) => {
  try {
    const user = await User.find();
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
