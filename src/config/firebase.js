import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBnMPz9US67gF5-221_90Vpgpb6Z-V9eKY",
  authDomain: "shubus.firebaseapp.com",
  projectId: "shubus",
  storageBucket: "shubus.firebasestorage.app",
  messagingSenderId: "782748859830",
  appId: "1:782748859830:web:b7355ada5e6ab7ca6e1517",

  // 🔥 IMPORTANT: Add Realtime DB URL
  databaseURL: "https://shubus-default-rtdb.asia-southeast1.firebasedatabase.app",
};

const app = initializeApp(firebaseConfig);

// 🔐 Auth
export const auth = getAuth(app);

// 📦 Firestore (Bookings, Users, etc.)
export const db = getFirestore(app);

// 📡 Realtime DB (Live GPS)
export const rtdb = getDatabase(app);