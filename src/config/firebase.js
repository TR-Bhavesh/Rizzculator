import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCuKpb0sGz5Ro3DryZy4_tvVDAF3dKwZkk",
  authDomain: "rizzculator.firebaseapp.com",
  projectId: "rizzculator",
  storageBucket: "rizzculator.firebasestorage.app",
  messagingSenderId: "428458938537",
  appId: "1:428458938537:web:39e1977ff35476b698d9b8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore Database
export const db = getFirestore(app);

// Initialize Authentication
export const auth = getAuth(app);

export default app;