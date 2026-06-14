import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC3SsEp4n8BsKg_iUHpFyoCpKQDroKjr0k",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "civitrack-6ba41.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "civitrack-6ba41",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "civitrack-6ba41.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "396457147354",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:396457147354:web:c240a95d5231e049561ee3",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-4NYPSHQFZW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' && firebaseConfig.measurementId ? getAnalytics(app) : null;

export { app, analytics };
