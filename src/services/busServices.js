import { db } from "../firebase/firebase"
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp
} from "firebase/firestore"

const busesRef = collection(db, "buses")

// ➕ Add new physical bus
export const addBus = async (busData) => {
  return await addDoc(busesRef, {
    ...busData,
    active: true,
    createdAt: serverTimestamp()
  })
}

// 📥 Get ALL buses (hardware only)
export const getAllBuses = async () => {
  const snapshot = await getDocs(busesRef)
  return snapshot.docs.map(d => ({
    id: d.id,
    ...d.data()
  }))
}

// ❌ Soft remove bus
export const disableBus = async (busId) => {
  const busRef = doc(db, "buses", busId)
  await updateDoc(busRef, { active: false })
}
