// src/services/busServices.js
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp
} from "firebase/firestore"
import { db } from "../config/firebase"

// ✅ GET ONLY ACTIVE BUSES
export async function getAllBuses() {
  const ref = collection(db, "buses")
  const q = query(ref, where("active", "==", true))

  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))
}

// ✅ ADD BUS (FIXED 50 SEATS)
export async function addBus(bus) {
  const ref = collection(db, "buses")

  // Prevent duplicate number plate
  const q = query(ref, where("numberPlate", "==", bus.numberPlate))
  const snap = await getDocs(q)

  if (!snap.empty) {
    throw new Error("Bus with this number plate already exists")
  }

  await addDoc(ref, {
    ...bus,
    totalSeats: 50,   // 🔥 FIXED HERE
    active: true,
    createdAt: serverTimestamp()
  })
}

// ✅ SOFT DELETE (DISABLE)
export async function disableBus(busId) {
  const ref = doc(db, "buses", busId)
  await updateDoc(ref, { active: false })
}

// ✅ UPDATE BUS
export async function updateBus(busId, updates) {
  const ref = doc(db, "buses", busId)
  await updateDoc(ref, updates)
}