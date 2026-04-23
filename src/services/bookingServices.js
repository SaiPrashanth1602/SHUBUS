/**
 * ─────────────────────────────────────────────────────────────
 * BOOKING SERVICES — All Firestore Operations
 * ─────────────────────────────────────────────────────────────
 * 
 * RULES:
 *  1. All writes use runTransaction (no race conditions)
 *  2. Seat locks have 5-minute expiry
 *  3. Booking closes 10 min before departure
 *  4. Cancel = HARD DELETE (booking doc + seat lock removed)
 *  5. Status values: "booked" | "claimed" — nothing else
 * ─────────────────────────────────────────────────────────────
 */

import { db } from "../config/firebase"
import {
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
  doc,
  onSnapshot,
  runTransaction,
  Timestamp,
  writeBatch,
  orderBy,
  limit,
} from "firebase/firestore"
import {
  BOOKING_CUTOFF_MINUTES,
  SEAT_LOCK_DURATION_MS,
  parseDepartureTime,
} from "./bookingStatus"
import { getServerTimeNow } from "./useServerTime"
import {
  detectAndProcessMisses,
  DEFAULT_PENALTY,
  isStudentBlocked,
  CANCEL_THRESHOLD,
  MISS_THRESHOLD,
  LOCK_DURATION_DAYS,
  FINE_AMOUNT,
} from "./penaltyService"

const bookingsRef = collection(db, "bookings")


// ─────────────────────────────────────────────────────────────
// 🎟️ 1. CLAIM SEAT
// ─────────────────────────────────────────────────────────────
export const claimSeat = async (bookingId, studentId) => {
  const bookingRef = doc(db, "bookings", bookingId)
  const studentRef = doc(db, "students", studentId)

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(bookingRef)
    if (!snap.exists()) throw new Error("Booking not found")

    const booking = snap.data()

    if (booking.studentId !== studentId)
      throw new Error("Unauthorized claim attempt")

    if (booking.claimed || booking.status === "claimed")
      throw new Error("Seat already claimed")

    // Read student penalty doc
    const stuSnap = await transaction.get(studentRef)
    const stuData = stuSnap.exists() ? { ...DEFAULT_PENALTY, ...stuSnap.data() } : { ...DEFAULT_PENALTY }

    // Update booking — set status to "claimed"
    transaction.update(bookingRef, {
      status: "claimed",
      claimed: true,
      claimedAt: serverTimestamp()
    })

    // Also update the seat subcollection doc so SeatLayout shows claimed status
    const seatRef = doc(db, "shuttles", booking.shuttleId, "seats", String(booking.seatNumber))
    transaction.update(seatRef, {
      claimed: true,
      claimedAt: serverTimestamp()
    })

    // Update student penalty stats: increment claims, reset BOTH counters
    transaction.set(studentRef, {
      ...stuData,
      totalClaims: (stuData.totalClaims || 0) + 1,
      consecutiveMisses: 0,
      consecutiveCancels: 0,
    }, { merge: true })
  })
}


// ─────────────────────────────────────────────────────────────
// 🎟️ 2. BOOK A SEAT (FULLY ATOMIC)
//    Now includes: cutoff enforcement + seat lock expiry
// ─────────────────────────────────────────────────────────────
export const bookSeat = async (studentId, shuttleId, seatNumber, busDetails) => {
  // 0️⃣ PRE-CHECK: detect and process any past missed bookings
  await detectAndProcessMisses(studentId)

  const seatKey = String(seatNumber)
  const shuttleRef = doc(db, "shuttles", shuttleId)
  const studentRef = doc(db, "students", studentId)

  // One booking per student per day (deterministic doc ID)
  const bookingId = `${studentId}_${busDetails.date}`
  const bookingRef = doc(db, "bookings", bookingId)

  // Seat lock doc
  const seatRef = doc(db, "shuttles", shuttleId, "seats", seatKey)

  await runTransaction(db, async (transaction) => {

    // 1️⃣ Read ALL docs first (Firestore transaction requirement)
    const existingBooking = await transaction.get(bookingRef)
    const seatSnap = await transaction.get(seatRef)
    const shuttleSnap = await transaction.get(shuttleRef)
    const stuSnap = await transaction.get(studentRef)
    const stuData = stuSnap.exists() ? { ...DEFAULT_PENALTY, ...stuSnap.data() } : { ...DEFAULT_PENALTY }

    // 2️⃣ Validate after reads

    // PENALTY CHECK: is student blocked?
    if (isStudentBlocked(stuData, getServerTimeNow())) {
      throw new Error("You are temporarily blocked due to misuse of bookings (missed/cancelled). Please pay fine to continue.")
    }

    // Check for duplicate booking
    if (existingBooking.exists()) {
      throw new Error("You already booked a seat today")
    }

    if (!shuttleSnap.exists()) throw new Error("Shuttle not found")

    const shuttleData = shuttleSnap.data()

    // 3️⃣ BOOKING CUTOFF ENFORCEMENT
    const departureTime = parseDepartureTime(shuttleData.date || busDetails.date, shuttleData.time || busDetails.time)
    if (departureTime) {
      const now = getServerTimeNow()
      const cutoffMs = BOOKING_CUTOFF_MINUTES * 60 * 1000
      const cutoffTime = new Date(departureTime.getTime() - cutoffMs)
      if (now >= cutoffTime) {
        throw new Error("Booking is closed for this shuttle (cutoff reached)")
      }
    }

    // 4️⃣ SEAT LOCK CHECK WITH EXPIRY
    if (seatSnap.exists()) {
      const seatData = seatSnap.data()
      const lockExpiry = seatData.lockedUntil

      // Check if lock is still active
      if (lockExpiry) {
        const expiryDate = lockExpiry.toDate ? lockExpiry.toDate() : new Date(lockExpiry)
        const now = getServerTimeNow()

        if (now < expiryDate) {
          // Lock is still active — is it this student's lock?
          if (seatData.studentId === studentId) {
            // Allow — student is confirming their own lock
          } else {
            throw new Error("Seat is temporarily locked by another student")
          }
        }
        // If expired, we allow overwriting below
      } else {
        // No lock expiry = permanent booking, seat is taken
        if (seatData.studentId && seatData.studentId !== studentId) {
          throw new Error("Seat already booked")
        }
      }
    }

    // 5️⃣ CAPACITY CHECK
    const currentBooked = shuttleData.bookedSeats || 0
    const total = shuttleData.totalSeats || 50

    if (currentBooked >= total) {
      throw new Error("Bus is full!")
    }

    // 6️⃣ Compute lock expiry timestamp
    const lockExpiry = Timestamp.fromDate(
      new Date(Date.now() + SEAT_LOCK_DURATION_MS)
    )

    // 7️⃣ Write operations (after all reads)

    // Update shuttle booked count (only increment if this is a NEW booking, not overwriting expired lock)
    const shouldIncrement = !seatSnap.exists() ||
      (seatSnap.exists() && seatSnap.data().studentId !== studentId)

    if (shouldIncrement) {
      transaction.update(shuttleRef, {
        bookedSeats: currentBooked + 1
      })
    }

    // Write seat lock
    transaction.set(seatRef, {
      seatNumber: seatKey,
      studentId,
      claimed: false,
      lockedUntil: lockExpiry,
      bookedAt: serverTimestamp()
    })

    // Write booking doc
    transaction.set(bookingRef, {
      studentId,
      shuttleId,
      seatNumber: seatKey,
      gpsId: shuttleData.gpsId || busDetails.gpsId || null,
      route: busDetails.route,
      date: busDetails.date,
      time: busDetails.time,
      status: "booked",
      claimed: false,
      bookedAt: serverTimestamp()
    })

    // Update student penalty stats: increment bookings
    transaction.set(studentRef, {
      ...stuData,
      totalBookings: (stuData.totalBookings || 0) + 1,
      lastBookingDate: busDetails.date,
    }, { merge: true })
  })
}


// ─────────────────────────────────────────────────────────────
// ❌ 3. CANCEL BOOKING (HARD DELETE)
//    Deletes booking document + seat lock document.
//    Decrements shuttle booked count.
//    Works for both "booked" and "claimed" bookings.
// ─────────────────────────────────────────────────────────────
export const cancelBooking = async (bookingId) => {
  const bookingRef = doc(db, "bookings", bookingId)

  await runTransaction(db, async (transaction) => {
    // 1️⃣ Read ALL docs first
    const bookingSnap = await transaction.get(bookingRef)

    if (!bookingSnap.exists()) throw new Error("Booking not found")

    const booking = bookingSnap.data()

    const shuttleRef = doc(db, "shuttles", booking.shuttleId)
    const seatRef = doc(db, "shuttles", booking.shuttleId, "seats", String(booking.seatNumber))
    const studentRef = doc(db, "students", booking.studentId)

    const shuttleSnap = await transaction.get(shuttleRef)
    const seatSnap = await transaction.get(seatRef)
    const stuSnap = await transaction.get(studentRef)
    const stuData = stuSnap.exists() ? { ...DEFAULT_PENALTY, ...stuSnap.data() } : { ...DEFAULT_PENALTY }

    // 2️⃣ Write operations (after all reads)

    // Delete the seat lock — makes the seat available again
    if (seatSnap.exists()) {
      transaction.delete(seatRef)
    }

    // Decrement booked count on the shuttle
    if (shuttleSnap.exists()) {
      const current = shuttleSnap.data().bookedSeats || 1
      transaction.update(shuttleRef, {
        bookedSeats: Math.max(0, current - 1)
      })
    }

    // Hard-delete the booking document
    transaction.delete(bookingRef)

    // Update student penalty stats: increment cancels, check penalty
    let newCancels = (stuData.consecutiveCancels || 0) + 1
    let newMisses = stuData.consecutiveMisses || 0
    let lockUntil = stuData.lockUntil || null
    let fineDue = stuData.fineDue || 0

    if (newCancels >= CANCEL_THRESHOLD || newMisses >= MISS_THRESHOLD) {
      const now = new Date()
      lockUntil = Timestamp.fromDate(
        new Date(now.getTime() + LOCK_DURATION_DAYS * 24 * 60 * 60 * 1000)
      )
      fineDue += FINE_AMOUNT
      newCancels = 0
      newMisses = 0
    }

    transaction.set(studentRef, {
      ...stuData,
      consecutiveCancels: newCancels,
      consecutiveMisses: newMisses,
      lockUntil,
      fineDue,
    }, { merge: true })
  })
}


// ─────────────────────────────────────────────────────────────
// 📊 4. SUBSCRIBE TO SEATS (REAL-TIME)
//    Single source of truth for SeatLayout UI.
//    Now includes lock expiry data.
// ─────────────────────────────────────────────────────────────
export const subscribeBookedSeats = (shuttleId, callback) => {
  if (!shuttleId) return () => {}

  const seatsRef = collection(db, "shuttles", shuttleId, "seats")

  return onSnapshot(seatsRef, (snapshot) => {
    const now = getServerTimeNow()

    const seats = snapshot.docs
      .map(d => {
        const data = d.data()
        const lockExpiry = data.lockedUntil
        let isLockExpired = false

        if (lockExpiry) {
          const expiryDate = lockExpiry.toDate ? lockExpiry.toDate() : new Date(lockExpiry)
          isLockExpired = now > expiryDate
        }

        return {
          seatNumber: d.id,
          studentId: data.studentId || null,
          claimed: data.claimed || false,
          lockedUntil: data.lockedUntil || null,
          isLockExpired,
        }
      })
      // Filter out expired locks — they're effectively available
      .filter(seat => !seat.isLockExpired)

    callback(seats)
  }, (error) => {
    console.error("❌ Seat subscription error:", error)
  })
}


// ─────────────────────────────────────────────────────────────
// 🔍 5. GET ALL BOOKINGS (ADMIN)
// ─────────────────────────────────────────────────────────────
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


// ─────────────────────────────────────────────────────────────
// 👤 6. GET STUDENT BOOKINGS
// ─────────────────────────────────────────────────────────────
export const getStudentBookings = async (studentId) => {
  const q = query(bookingsRef, where("studentId", "==", studentId))
  const snapshot = await getDocs(q)

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))
}


// ─────────────────────────────────────────────────────────────
// 🧹 7. MAINTENANCE: Clear Expired Seat Locks
// ─────────────────────────────────────────────────────────────
export const clearExpiredSeatLocks = async () => {
  const shuttlesSnap = await getDocs(collection(db, "shuttles"))
  let cleaned = 0

  for (const shuttleDoc of shuttlesSnap.docs) {
    const seatsSnap = await getDocs(
      collection(db, "shuttles", shuttleDoc.id, "seats")
    )

    const batch = writeBatch(db)
    let batchCount = 0
    const now = getServerTimeNow()

    for (const seatDoc of seatsSnap.docs) {
      const data = seatDoc.data()

      // Skip seats that are permanently claimed
      if (data.claimed) continue

      // Check lock expiry
      if (data.lockedUntil) {
        const expiry = data.lockedUntil.toDate
          ? data.lockedUntil.toDate()
          : new Date(data.lockedUntil)

        if (now > expiry) {
          batch.delete(seatDoc.ref)
          batchCount++
        }
      }
    }

    if (batchCount > 0) {
      await batch.commit()
      cleaned += batchCount
    }
  }

  return cleaned
}


// ─────────────────────────────────────────────────────────────
// 🧹 8. MAINTENANCE: Archive Past Bookings
//    Marks old bookings as archived (does NOT delete)
// ─────────────────────────────────────────────────────────────
export const archivePastBookings = async (daysOld = 7) => {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)
  const cutoffStr = cutoffDate.toISOString().split("T")[0]

  const snapshot = await getDocs(bookingsRef)
  let archived = 0

  const batch = writeBatch(db)

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data()

    if (data.archived) continue // Already archived
    if (!data.date) continue

    if (data.date < cutoffStr) {
      batch.update(docSnap.ref, {
        archived: true,
        archivedAt: serverTimestamp()
      })
      archived++
    }
  }

  if (archived > 0) {
    await batch.commit()
  }

  return archived
}


// ─────────────────────────────────────────────────────────────
// 🧹 9. MAINTENANCE: Hard Reset
//    Clears all seat locks and resets shuttle counts.
//    Does NOT delete booking history.
// ─────────────────────────────────────────────────────────────
export const hardResetSystem = async () => {
  const shuttlesSnap = await getDocs(collection(db, "shuttles"))

  for (const shuttleDoc of shuttlesSnap.docs) {
    // Delete all seat docs
    const seatsSnap = await getDocs(
      collection(db, "shuttles", shuttleDoc.id, "seats")
    )

    const batch = writeBatch(db)
    let batchCount = 0

    for (const seatDoc of seatsSnap.docs) {
      batch.delete(seatDoc.ref)
      batchCount++
    }

    // Reset booked count
    batch.update(shuttleDoc.ref, { bookedSeats: 0 })
    batchCount++

    if (batchCount > 0) {
      await batch.commit()
    }
  }

  return true
}


// ─────────────────────────────────────────────────────────────
// 📊 10. GET BOOKINGS FOR ANALYTICS (Last N days)
// ─────────────────────────────────────────────────────────────
export const getRecentBookings = async (days = 7) => {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  const cutoffStr = cutoffDate.toISOString().split("T")[0]

  const q = query(
    bookingsRef,
    where("date", ">=", cutoffStr)
  )

  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))
}