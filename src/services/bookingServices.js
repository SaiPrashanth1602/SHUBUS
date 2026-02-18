import { db } from "../config/firebase"
import {
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
  doc,
  onSnapshot,
  runTransaction
} from "firebase/firestore"

const bookingsRef = collection(db, "bookings")

// 🎟️ 1. CLAIM SEAT (Verification via GPS)
export const claimSeat = async (bookingId, studentId) => {
  const bookingRef = doc(db, "bookings", bookingId)

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(bookingRef)
    if (!snap.exists()) throw new Error("Booking not found")

    const booking = snap.data()
    if (booking.studentId !== studentId) throw new Error("Unauthorized claim attempt")
    if (booking.claimed) throw new Error("Seat already claimed")

    transaction.update(bookingRef, {
      claimed: true,
      claimedAt: serverTimestamp()
    })
  })
}

// 🎟️ 2. BOOK A SEAT
export const bookSeat = async (studentId, shuttleId, seatNumber, busDetails) => {
  const shuttleRef = doc(db, "shuttles", shuttleId);

  await runTransaction(db, async (transaction) => {
    const shuttleSnap = await transaction.get(shuttleRef);

    if (!shuttleSnap.exists()) throw new Error("Shuttle not found");

    const shuttleData = shuttleSnap.data();
    const currentBooked = shuttleData.bookedSeats || 0;
    const total = shuttleData.totalSeats || 50;

    // Check if bus is full
    if (currentBooked >= total) throw new Error("Bus is full!");

    // 1. UPDATE SHUTTLE COUNT
    transaction.update(shuttleRef, {
      bookedSeats: currentBooked + 1
    });

    // 2. CREATE BOOKING RECORD
    const newBookingRef = doc(collection(db, "bookings"));
    transaction.set(newBookingRef, {
  studentId,
  shuttleId,
  seatNumber,
  gpsId: shuttleData.gpsId || busDetails.gpsId, // 🔥 ADD THIS
  route: busDetails.route,
  date: busDetails.date,
  time: busDetails.time,
  status: "confirmed",
  claimed: false,              // 🔥 important default
  bookedAt: serverTimestamp()
})
  });
};

// 📊 3. SUBSCRIBE TO SEATS (Real-time Layout)
export const subscribeBookedSeats = (shuttleId, callback) => {
  if (!shuttleId) return () => {}
  const q = query(bookingsRef, where("shuttleId", "==", shuttleId), where("status", "==", "confirmed"))
  return onSnapshot(q, (snapshot) => {
    const seats = snapshot.docs.map(doc => {
  const data = doc.data()
  return {
    seatNumber: data.seatNumber,
    claimed: data.claimed === true
  }
})
    callback(seats)
  })
}

// 🔍 4. GET ALL BOOKINGS (For Admin View)
export const getAllBookings = async () => {
  try {
    const snapshot = await getDocs(bookingsRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching all bookings:", error);
    throw error;
  }
}

// 👤 5. GET STUDENT SPECIFIC BOOKINGS
export const getStudentBookings = async (studentId) => {
  const q = query(bookingsRef, where("studentId", "==", studentId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}