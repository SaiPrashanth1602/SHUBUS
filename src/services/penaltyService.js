/**
 * ─────────────────────────────────────────────────────────────
 * PENALTY SERVICE — Miss Detection & Student Blocking
 * ─────────────────────────────────────────────────────────────
 *
 * Data model: students/{studentId}
 * Fields: totalBookings, totalClaims, consecutiveMisses,
 *         consecutiveCancels, lastBookingDate, lockUntil, fineDue
 *
 * A "miss" = booking with status "booked" past departure time.
 * 3 consecutive misses OR 3 consecutive cancels = 7-day lock + ₹100 fine.
 * ─────────────────────────────────────────────────────────────
 */

import { db } from "../config/firebase"
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  runTransaction,
  onSnapshot,
  Timestamp,
} from "firebase/firestore"
import { parseDepartureTime } from "./bookingStatus"
import { getServerTimeNow } from "./useServerTime"

// ── CONFIGURABLE CONSTANTS ───────────────────────────────────
export const MISS_THRESHOLD = 3
export const CANCEL_THRESHOLD = 3
export const LOCK_DURATION_DAYS = 7
export const FINE_AMOUNT = 100

// ── DEFAULT PENALTY DATA ─────────────────────────────────────
export const DEFAULT_PENALTY = {
  totalBookings: 0,
  totalClaims: 0,
  consecutiveMisses: 0,
  consecutiveCancels: 0,
  lastBookingDate: null,
  lockUntil: null,
  fineDue: 0,
}

// ── Helper: student doc ref ──────────────────────────────────
const studentDocRef = (studentId) => doc(db, "students", studentId)


// ─────────────────────────────────────────────────────────────
// 1. GET STUDENT PENALTY DATA (one-time read)
// ─────────────────────────────────────────────────────────────
export async function getStudentPenaltyData(studentId) {
  const snap = await getDoc(studentDocRef(studentId))
  return snap.exists() ? { ...DEFAULT_PENALTY, ...snap.data() } : { ...DEFAULT_PENALTY }
}


// ─────────────────────────────────────────────────────────────
// 2. SUBSCRIBE TO PENALTY DATA (realtime)
// ─────────────────────────────────────────────────────────────
export function subscribeStudentPenalty(studentId, callback) {
  if (!studentId) return () => {}

  return onSnapshot(studentDocRef(studentId), (snap) => {
    callback(snap.exists() ? { ...DEFAULT_PENALTY, ...snap.data() } : { ...DEFAULT_PENALTY })
  })
}


// ─────────────────────────────────────────────────────────────
// 3. IS STUDENT BLOCKED?
// ─────────────────────────────────────────────────────────────
export function isStudentBlocked(penaltyData, serverTime) {
  if (!penaltyData?.lockUntil) return false
  const lockEnd = penaltyData.lockUntil.toDate
    ? penaltyData.lockUntil.toDate()
    : new Date(penaltyData.lockUntil)
  return (serverTime || new Date()) < lockEnd
}

// Helper: get lock end date for display
export function getLockEndDate(penaltyData) {
  if (!penaltyData?.lockUntil) return null
  return penaltyData.lockUntil.toDate
    ? penaltyData.lockUntil.toDate()
    : new Date(penaltyData.lockUntil)
}


// ─────────────────────────────────────────────────────────────
// 4. DETECT AND PROCESS MISSED BOOKINGS
//
//    Finds "booked" (not claimed) bookings past departure,
//    deletes them, frees seats, and updates penalty stats.
//    Called before booking and when viewing bookings.
// ─────────────────────────────────────────────────────────────
export async function detectAndProcessMisses(studentId) {
  const now = getServerTimeNow()

  // Step 1: Query missed bookings OUTSIDE transaction
  const q = query(
    collection(db, "bookings"),
    where("studentId", "==", studentId),
    where("status", "==", "booked")
  )

  const snapshot = await getDocs(q)

  // Filter to only those past departure
  const missedIds = []
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data()
    const departure = parseDepartureTime(data.date, data.time)
    if (departure && now > departure) {
      missedIds.push(docSnap.id)
    }
  }

  if (missedIds.length === 0) return 0

  // Step 2: Process inside a transaction
  await runTransaction(db, async (transaction) => {
    // ── READS FIRST ──
    const stuSnap = await transaction.get(studentDocRef(studentId))
    const stuData = stuSnap.exists() ? { ...DEFAULT_PENALTY, ...stuSnap.data() } : { ...DEFAULT_PENALTY }

    // Re-read each booking to verify it still exists
    const validMisses = []
    const bookingRefs = {}
    for (const id of missedIds) {
      const ref = doc(db, "bookings", id)
      const snap = await transaction.get(ref)
      if (snap.exists() && snap.data().status === "booked") {
        validMisses.push({ id, ...snap.data() })
        bookingRefs[id] = ref
      }
    }

    if (validMisses.length === 0) return

    // Read shuttle + seat docs for each miss
    const shuttleSnaps = {}
    const seatRefs = {}
    const seatSnaps = {}

    for (const missed of validMisses) {
      // Read shuttle (deduplicate by shuttleId)
      if (!shuttleSnaps[missed.shuttleId]) {
        const sRef = doc(db, "shuttles", missed.shuttleId)
        shuttleSnaps[missed.shuttleId] = await transaction.get(sRef)
      }
      // Read seat
      const seatRef = doc(db, "shuttles", missed.shuttleId, "seats", String(missed.seatNumber))
      seatRefs[missed.id] = seatRef
      seatSnaps[missed.id] = await transaction.get(seatRef)
    }

    // ── WRITES AFTER ALL READS ──

    // Delete each missed booking + seat lock
    for (const missed of validMisses) {
      transaction.delete(bookingRefs[missed.id])
      if (seatSnaps[missed.id]?.exists()) {
        transaction.delete(seatRefs[missed.id])
      }
    }

    // Decrement shuttle bookedSeats (grouped by shuttle)
    const decrements = {}
    for (const missed of validMisses) {
      decrements[missed.shuttleId] = (decrements[missed.shuttleId] || 0) + 1
    }
    for (const [shuttleId, count] of Object.entries(decrements)) {
      const snap = shuttleSnaps[shuttleId]
      if (snap?.exists()) {
        const current = snap.data().bookedSeats || count
        transaction.update(doc(db, "shuttles", shuttleId), {
          bookedSeats: Math.max(0, current - count)
        })
      }
    }

    // Update penalty stats
    let newMisses = (stuData.consecutiveMisses || 0) + validMisses.length
    let newCancels = stuData.consecutiveCancels || 0
    let lockUntil = stuData.lockUntil || null
    let fineDue = stuData.fineDue || 0

    // Penalty triggers on either threshold
    if (newMisses >= MISS_THRESHOLD || newCancels >= CANCEL_THRESHOLD) {
      lockUntil = Timestamp.fromDate(
        new Date(now.getTime() + LOCK_DURATION_DAYS * 24 * 60 * 60 * 1000)
      )
      fineDue += FINE_AMOUNT
      newMisses = 0
      newCancels = 0
    }

    transaction.set(studentDocRef(studentId), {
      ...stuData,
      consecutiveMisses: newMisses,
      consecutiveCancels: newCancels,
      lockUntil,
      fineDue,
    }, { merge: true })
  })

  return missedIds.length
}


// ─────────────────────────────────────────────────────────────
// 5. PAY FINE (simulated — resets lock and fine)
// ─────────────────────────────────────────────────────────────
export async function payFine(studentId) {
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(studentDocRef(studentId))
    if (!snap.exists()) throw new Error("Student record not found")

    transaction.update(studentDocRef(studentId), {
      fineDue: 0,
      lockUntil: null,
    })
  })
}
