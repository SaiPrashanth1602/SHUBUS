import { db } from "../firebase/firebase"
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp
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

// 📥 Get shuttles by date (what students/admin see)
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
