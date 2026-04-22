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

// 🎟️ 1. CLAIM SEAT
export const claimSeat = async (bookingId, studentId) => {
  const bookingRef = doc(db, "bookings", bookingId)

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(bookingRef)
    if (!snap.exists()) throw new Error("Booking not found")

    const booking = snap.data()

    if (booking.studentId !== studentId)
      throw new Error("Unauthorized claim attempt")

    if (booking.claimed)
      throw new Error("Seat already claimed")

    transaction.update(bookingRef, {
      claimed: true,
      claimedAt: serverTimestamp()
    })
  })
}


// 🎟️ 2. BOOK A SEAT (FULL SAFE VERSION)
export const bookSeat = async (studentId, shuttleId, seatNumber, busDetails) => {
  const shuttleRef = doc(db, "shuttles", shuttleId)

  // 🔒 one booking per student per day
  const bookingId = `${studentId}_${busDetails.date}`
  const bookingRef = doc(db, "bookings", bookingId)

  // 🔒 seat lock doc
  const seatRef = doc(db, "shuttles", shuttleId, "seats", seatNumber)

  await runTransaction(db, async (transaction) => {

    // 1️⃣ check if student already booked
    const existingBooking = await transaction.get(bookingRef)
    if (existingBooking.exists()) {
      throw new Error("You already booked a seat today")
    }

    // 2️⃣ check if seat already taken
    const seatSnap = await transaction.get(seatRef)
    if (seatSnap.exists()) {
      throw new Error("Seat already booked")
    }

    // 3️⃣ get shuttle
    const shuttleSnap = await transaction.get(shuttleRef)
    if (!shuttleSnap.exists()) throw new Error("Shuttle not found")

    const shuttleData = shuttleSnap.data()
    const currentBooked = shuttleData.bookedSeats || 0
    const total = shuttleData.totalSeats || 50

    // 4️⃣ capacity check
    if (currentBooked >= total) {
      throw new Error("Bus is full!")
    }

    // 5️⃣ update shuttle count
    transaction.update(shuttleRef, {
      bookedSeats: currentBooked + 1
    })

    // 6️⃣ lock seat
    transaction.set(seatRef, {
      seatNumber,
      studentId
    })

    // 7️⃣ create booking
    transaction.set(bookingRef, {
      studentId,
      shuttleId,
      seatNumber,
      gpsId: shuttleData.gpsId || busDetails.gpsId,
      route: busDetails.route,
      date: busDetails.date,
      time: busDetails.time,
      status: "confirmed",
      claimed: false,
      bookedAt: serverTimestamp()
    })
  })
}


// ❌ 3. CANCEL BOOKING (IMPORTANT FIX)
export const cancelBooking = async (bookingId) => {
  const bookingRef = doc(db, "bookings", bookingId)

  await runTransaction(db, async (transaction) => {
    const bookingSnap = await transaction.get(bookingRef)

    if (!bookingSnap.exists()) throw new Error("Booking not found")

    const booking = bookingSnap.data()

    const shuttleRef = doc(db, "shuttles", booking.shuttleId)
    const seatRef = doc(db, "shuttles", booking.shuttleId, "seats", booking.seatNumber)

    // 1️⃣ delete seat lock
    transaction.delete(seatRef)

    // 2️⃣ decrease booked count
    const shuttleSnap = await transaction.get(shuttleRef)
    if (shuttleSnap.exists()) {
      const current = shuttleSnap.data().bookedSeats || 1

      transaction.update(shuttleRef, {
        bookedSeats: Math.max(0, current - 1)
      })
    }

    // 3️⃣ delete booking
    transaction.delete(bookingRef)
  })
}


// 📊 4. SUBSCRIBE TO SEATS (REAL-TIME)
export const subscribeBookedSeats = (shuttleId, callback) => {
  if (!shuttleId) return () => {}

  const seatsRef = collection(db, "shuttles", shuttleId, "seats")

  return onSnapshot(seatsRef, (snapshot) => {
    const seats = snapshot.docs.map(doc => ({
      seatNumber: doc.id,
      claimed: false
    }))
    callback(seats)
  })
}


// 🔍 5. GET ALL BOOKINGS (ADMIN)
export const getAllBookings = async () => {
  try {
    const snapshot = await getDocs(bookingsRef)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error("Error fetching bookings:", error)
    throw error
  }
}


// 👤 6. GET STUDENT BOOKINGS
export const getStudentBookings = async (studentId) => {
  const q = query(bookingsRef, where("studentId", "==", studentId))
  const snapshot = await getDocs(q)

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))
}