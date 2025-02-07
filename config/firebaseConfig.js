import firebaseAdmin from 'firebase-admin';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import path from 'path';

dotenv.config();

const serviceAccount = JSON.parse(readFileSync(path.resolve('config/serviceAccountKey.json'), 'utf8'));

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
});

export default firebaseAdmin;
