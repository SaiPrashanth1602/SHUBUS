import { db } from "../config/firebase"
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  doc,
  updateDoc,
  onSnapshot
} from "firebase/firestore"


const shuttlesRef = collection(db, "shuttles")

// ➕ Add running shuttle
// shuttleServices.js
// Inside shuttleServices.js

export const addShuttle = async (shuttleData) => {
  // Check for both busId and gpsId
  if (!shuttleData.busId) {
    throw new Error("Cannot add shuttle: busId is missing");
  }
  
  if (!shuttleData.gpsId) {
    throw new Error("Cannot add shuttle: This bus has no GPS ID linked.");
  }

  return await addDoc(shuttlesRef, {
    ...shuttleData,
    totalSeats: 50,
    bookedSeats: 0,
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

// 🔄 Realtime shuttles by date (ADMIN ONLY)
// 🔄 Realtime shuttles by date (ADMIN ONLY)
export const subscribeShuttlesByDate = (date, callback) => {
  const q = query(
    shuttlesRef,
    where("date", "==", date),
    where("active", "==", true)
  );

  // Return the unsubscribe function directly
  return onSnapshot(
    q,
    (snapshot) => {
      console.log("🔥 SNAPSHOT UPDATE", snapshot.docs.length);
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      callback(data);
    },
    (error) => {
      console.error("❌ SNAPSHOT ERROR", error);
    }
  );
};

