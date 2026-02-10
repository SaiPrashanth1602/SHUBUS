import { db } from "../config/firebase"
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

// This points to your "BOOKING DB"
const bookingsRef = collection(db, "bookings")

// 🎟️ 1. BOOK A SEAT (For Student)
export const bookSeat = async (studentId, shuttleId, seatNumber, busDetails) => {
  // Check if seat is already taken (Double check security)
  const q = query(
    bookingsRef,
    where("shuttleId", "==", shuttleId),
    where("seatNumber", "==", seatNumber),
    where("status", "==", "confirmed")
  );
  
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    throw new Error("Seat already taken!");
  }

  // Add the ticket to the database
  return await addDoc(bookingsRef, {
    studentId: studentId,
    shuttleId: shuttleId,
    seatNumber: seatNumber,
    busDetails: busDetails, // Save bus info so we can show it in "My Bookings"
    status: "confirmed",
    bookedAt: serverTimestamp()
  })
}

// 📋 2. GET BOOKED SEATS FOR A BUS (For Seat Layout)
// This ensures Student B sees Student A's red seat
export const getBookedSeats = async (shuttleId) => {
  const q = query(
    bookingsRef, 
    where("shuttleId", "==", shuttleId),
    where("status", "==", "confirmed")
  );

  const snapshot = await getDocs(q);
  // Return a simple list of seat numbers (e.g., [12, 14, 25])
  return snapshot.docs.map(doc => doc.data().seatNumber);
}

// 👤 3. GET MY BOOKINGS (For Student Dashboard)
export const getStudentBookings = async (studentId) => {
  const q = query(
    bookingsRef, 
    where("studentId", "==", studentId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

// 👮 4. ADMIN: GET ALL BOOKINGS (For your View Bookings page)
export const getAllBookings = async () => {
  const snapshot = await getDocs(bookingsRef);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}