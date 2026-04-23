/**
 * ─────────────────────────────────────────────────────────────
 * BOOKING STATUS ENGINE — Single Source of Truth
 * ─────────────────────────────────────────────────────────────
 * 
 * ALL status logic lives HERE. No component should derive
 * booking state independently. Import these functions.
 * 
 * Booking statuses (Firestore): "booked" | "claimed"
 * Journey statuses (derived):   UPCOMING | BOARDING_SOON | DEPARTED
 * ─────────────────────────────────────────────────────────────
 */

// ── CONSTANTS ────────────────────────────────────────────────
export const BOOKING_CUTOFF_MINUTES = 10 // Booking closes 10 min before departure
export const SEAT_LOCK_DURATION_MS = 5 * 60 * 1000 // 5 minute seat lock

// ── BOOKING STATUS VALUES (STRICT — only these two in Firestore) ──
export const BookingStatus = {
  BOOKED: "booked",
  CLAIMED: "claimed",
}

// ── JOURNEY STATUS VALUES (derived from time, never stored) ──
export const JourneyStatus = {
  UPCOMING: "UPCOMING",
  BOARDING_SOON: "BOARDING_SOON",
  DEPARTED: "DEPARTED",
}

// ── BOOKING WINDOW VALUES ────────────────────────────────────
export const WindowStatus = {
  OPEN: "OPEN",
  CLOSING: "CLOSING",
  CLOSED: "CLOSED",
}

// ── BADGE CONFIG ─────────────────────────────────────────────
export const STATUS_BADGE = {
  [BookingStatus.BOOKED]: {
    label: "Booked",
    bg: "bg-green-100",
    text: "text-green-700",
    border: "border-green-200",
    dot: "bg-green-500",
  },
  [BookingStatus.CLAIMED]: {
    label: "Claimed",
    bg: "bg-purple-100",
    text: "text-purple-700",
    border: "border-purple-200",
    dot: "bg-purple-500",
  },
}

// ── JOURNEY STATUS BADGE CONFIG ──────────────────────────────
export const JOURNEY_BADGE = {
  [JourneyStatus.UPCOMING]: {
    label: "Upcoming",
    icon: "⏳",
    message: "Your journey hasn't started yet",
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-200",
  },
  [JourneyStatus.BOARDING_SOON]: {
    label: "Boarding Soon",
    icon: "🚌",
    message: "Head to the bus stop",
    bg: "bg-amber-50",
    text: "text-amber-600",
    border: "border-amber-200",
  },
  [JourneyStatus.DEPARTED]: {
    label: "Journey in Progress",
    icon: "🛣️",
    message: "Your bus has departed",
    bg: "bg-green-50",
    text: "text-green-600",
    border: "border-green-200",
  },
}

export const WINDOW_BADGE = {
  [WindowStatus.OPEN]: {
    label: "Open",
    bg: "bg-green-100",
    text: "text-green-700",
    border: "border-green-200",
  },
  [WindowStatus.CLOSING]: {
    label: "Closing Soon",
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    border: "border-yellow-200",
  },
  [WindowStatus.CLOSED]: {
    label: "Closed",
    bg: "bg-red-100",
    text: "text-red-600",
    border: "border-red-200",
  },
}


// ─────────────────────────────────────────────────────────────
// PARSE DEPARTURE TIME
// Converts date string "2026-04-22" + time string "1:20"
// into a proper Date object
// ─────────────────────────────────────────────────────────────
export function parseDepartureTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null

  try {
    const [year, month, day] = dateStr.split("-").map(Number)

    // Handle "1:20", "13:20", "1:20 PM" formats
    let hours, minutes
    const cleaned = timeStr.trim().toUpperCase()
    const isPM = cleaned.includes("PM")
    const isAM = cleaned.includes("AM")
    const timePart = cleaned.replace(/\s*(AM|PM)\s*/i, "")

    const parts = timePart.split(":").map(Number)
    hours = parts[0]
    minutes = parts[1] || 0

    if (isPM && hours < 12) hours += 12
    if (isAM && hours === 12) hours = 0

    // If time is 1:20 or 1:45 without AM/PM, assume PM (school context)
    if (!isPM && !isAM && hours < 6) hours += 12

    return new Date(year, month - 1, day, hours, minutes, 0, 0)
  } catch (e) {
    console.error("Failed to parse departure time:", dateStr, timeStr, e)
    return null
  }
}


// ─────────────────────────────────────────────────────────────
// GET BOOKING STATUS — The single source of truth
// 
// Derives display status from booking data.
// Only returns BookingStatus.BOOKED or BookingStatus.CLAIMED.
// ─────────────────────────────────────────────────────────────
export function getBookingStatus(booking) {
  if (!booking) return BookingStatus.BOOKED

  // Claimed seat (check both field and status for robustness)
  if (booking.claimed === true || booking.status === "claimed") {
    return BookingStatus.CLAIMED
  }

  return BookingStatus.BOOKED
}


// ─────────────────────────────────────────────────────────────
// GET JOURNEY STATUS — Derived from departure time
// 
// UPCOMING       → departure is > 15 minutes away
// BOARDING_SOON  → departure is within 15 minutes
// DEPARTED       → departure time has passed
// ─────────────────────────────────────────────────────────────
export function getJourneyStatus(dateStr, timeStr, serverTime) {
  const now = serverTime || new Date()
  const departure = parseDepartureTime(dateStr, timeStr)

  if (!departure) return JourneyStatus.UPCOMING

  const msUntilDeparture = departure.getTime() - now.getTime()

  if (msUntilDeparture <= 0) return JourneyStatus.DEPARTED
  if (msUntilDeparture <= 15 * 60 * 1000) return JourneyStatus.BOARDING_SOON
  return JourneyStatus.UPCOMING
}


// ─────────────────────────────────────────────────────────────
// GET BOOKING WINDOW STATUS
// 
// Determines if booking is OPEN, CLOSING, or CLOSED
// for a given shuttle departure time.
// ─────────────────────────────────────────────────────────────
export function getBookingWindowStatus(dateStr, timeStr, serverTime) {
  const now = serverTime || new Date()
  const departure = parseDepartureTime(dateStr, timeStr)

  if (!departure) return WindowStatus.CLOSED

  const cutoffMs = BOOKING_CUTOFF_MINUTES * 60 * 1000
  const cutoffTime = new Date(departure.getTime() - cutoffMs)
  const msUntilCutoff = cutoffTime.getTime() - now.getTime()

  if (msUntilCutoff <= 0) {
    return WindowStatus.CLOSED
  }

  // CLOSING = less than 10 minutes until cutoff
  if (msUntilCutoff <= cutoffMs) {
    return WindowStatus.CLOSING
  }

  return WindowStatus.OPEN
}


// ─────────────────────────────────────────────────────────────
// GET TIME UNTIL CUTOFF
// 
// Returns minutes/seconds until booking window closes.
// Returns null if already closed.
// ─────────────────────────────────────────────────────────────
export function getTimeUntilCutoff(dateStr, timeStr, serverTime) {
  const now = serverTime || new Date()
  const departure = parseDepartureTime(dateStr, timeStr)

  if (!departure) return null

  const cutoffMs = BOOKING_CUTOFF_MINUTES * 60 * 1000
  const cutoffTime = new Date(departure.getTime() - cutoffMs)
  const totalMs = cutoffTime.getTime() - now.getTime()

  if (totalMs <= 0) return null

  const totalSeconds = Math.floor(totalMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return { minutes, seconds, totalMs }
}


// ─────────────────────────────────────────────────────────────
// GET TIME UNTIL DEPARTURE
// 
// Returns time remaining until actual departure.
// ─────────────────────────────────────────────────────────────
export function getTimeUntilDeparture(dateStr, timeStr, serverTime) {
  const now = serverTime || new Date()
  const departure = parseDepartureTime(dateStr, timeStr)

  if (!departure) return null

  const totalMs = departure.getTime() - now.getTime()
  if (totalMs <= 0) return null

  const totalSeconds = Math.floor(totalMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return { hours, minutes, seconds, totalMs }
}


// ─────────────────────────────────────────────────────────────
// FORMAT COUNTDOWN
// ─────────────────────────────────────────────────────────────
export function formatCountdown(timeObj) {
  if (!timeObj) return "--:--:--"

  let hours = timeObj.hours || 0
  let minutes = timeObj.minutes || 0
  let seconds = timeObj.seconds || 0

  // 🔥 FIX: normalize minutes > 59
  if (minutes >= 60) {
    hours += Math.floor(minutes / 60)
    minutes = minutes % 60
  }

  // 🔥 FIX: normalize seconds > 59 (just in case)
  if (seconds >= 60) {
    minutes += Math.floor(seconds / 60)
    seconds = seconds % 60
  }

  const h = String(hours).padStart(2, "0")
  const m = String(minutes).padStart(2, "0")
  const s = String(seconds).padStart(2, "0")

  return `${h}:${m}:${s}`
}


// ─────────────────────────────────────────────────────────────
// IS SEAT LOCK EXPIRED
// ─────────────────────────────────────────────────────────────
export function isSeatLockExpired(seatDoc, serverTime) {
  if (!seatDoc || !seatDoc.lockedUntil) return true

  const now = serverTime || new Date()
  const lockEnd = seatDoc.lockedUntil.toDate
    ? seatDoc.lockedUntil.toDate()
    : new Date(seatDoc.lockedUntil)

  return now > lockEnd
}


// ─────────────────────────────────────────────────────────────
// DEMAND LEVEL
// ─────────────────────────────────────────────────────────────
export const DemandLevel = {
  NORMAL: "NORMAL",
  HIGH: "HIGH",
  FULL: "FULL",
}

export function getDemandLevel(bookedSeats, totalSeats) {
  if (!totalSeats || totalSeats <= 0) return DemandLevel.NORMAL
  const ratio = bookedSeats / totalSeats

  if (ratio >= 1) return DemandLevel.FULL
  if (ratio >= 0.8) return DemandLevel.HIGH
  return DemandLevel.NORMAL
}

export const DEMAND_BADGE = {
  [DemandLevel.NORMAL]: null, // No badge for normal
  [DemandLevel.HIGH]: {
    label: "High Demand",
    bg: "bg-orange-100",
    text: "text-orange-700",
    border: "border-orange-200",
  },
  [DemandLevel.FULL]: {
    label: "Full",
    bg: "bg-red-100",
    text: "text-red-600",
    border: "border-red-200",
  },
}
