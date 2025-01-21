import firebaseAdmin from 'firebase-admin';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import path from 'path';

dotenv.config();

// Đọc tệp service account key
const serviceAccount = JSON.parse(readFileSync(path.resolve('config/serviceAccountKey.json'), 'utf8'));

// Khởi tạo Firebase Admin SDK
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
});

export default firebaseAdmin;
