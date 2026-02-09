import { db } from "../firebase/firebase"
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  doc,
  updateDoc
} from "firebase/firestore"

const shuttlesRef = collection(db, "shuttles")

// ➕ Add running shuttle
export const addShuttle = async (shuttleData) => {
  return await addDoc(shuttlesRef, {
    ...shuttleData,
    active: true,
    createdAt: serverTimestamp()
  })
}

// 📥 Get shuttles by date (admin + students)
export const getShuttlesByDate = async (date) => {
  const q = query(
    shuttlesRef,
    where("date", "==", date),
    where("active", "==", true)
  )

  const snapshot = await getDocs(q)
  return snapshot.docs.map(d => ({
    id: d.id,
    ...d.data()
  }))
}

// ❌ Soft cancel shuttle
export const cancelShuttle = async (shuttleId) => {
  const shuttleRef = doc(db, "shuttles", shuttleId)
  await updateDoc(shuttleRef, { active: false })
}

// ✏️ Update shuttle (route / time only)
export const updateShuttle = async (shuttleId, updates) => {
  const shuttleRef = doc(db, "shuttles", shuttleId)
  await updateDoc(shuttleRef, updates)
}
