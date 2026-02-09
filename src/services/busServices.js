// src/services/busServices.js
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  addDoc
} from "firebase/firestore"
import { db } from "../config/firebase"

// ✅ GET ONLY ACTIVE BUSES
export async function getAllBuses() {
  const ref = collection(db, "buses")
  const q = query(ref, where("active", "!=", false))

  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))
}

// ✅ ADD BUS (DEFAULT ACTIVE)
export async function addBus(bus) {
  const ref = collection(db, "buses")
  await addDoc(ref, {
    ...bus,
    active: true
  })
}

// ✅ SOFT DELETE (DISABLE)
export async function disableBus(busId) {
  const ref = doc(db, "buses", busId)
  await updateDoc(ref, {
    active: false
  })
}

// ✅ UPDATE BUS
export async function updateBus(busId, updates) {
  const ref = doc(db, "buses", busId)
  await updateDoc(ref, updates)
}
