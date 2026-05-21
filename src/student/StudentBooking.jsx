import { useEffect, useState } from "react"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { auth, db } from "../config/firebase"
import { onAuthStateChanged } from "firebase/auth"
import PageWrapper from "../components/layout/PageWrapper"
import { useNavigate } from "react-router-dom"
import { cancelBooking } from "../services/bookingServices"
import ConfirmModal from "../components/ui/ConfirmModal"
import Toast from "../components/ui/Toast"
import { useServerTime } from "../services/useServerTime"
import {
  getBookingStatus,
  getJourneyStatus,
  getTimeUntilCutoff,
  formatCountdown,
  BookingStatus,
  JourneyStatus,
  STATUS_BADGE,
  JOURNEY_BADGE,
} from "../services/bookingStatus"
import {
  subscribeStudentPenalty,
  detectAndProcessMisses,
  isStudentBlocked,
  getLockEndDate,
  payFine,
  MISS_THRESHOLD,
  CANCEL_THRESHOLD,
} from "../services/penaltyService"

// Helper to format timestamps nicely
const formatDate = (timestamp) => {
  if (!timestamp) return "Date Pending"
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleString('en-IN', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}


function StudentBooking() {
  const navigate = useNavigate()
  const { serverTime, isLoaded: timeLoaded } = useServerTime()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [toastType, setToastType] = useState("success")
  const [showToast, setShowToast] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)

  // ── PENALTY STATE ──
  const [penaltyData, setPenaltyData] = useState(null)
  const [payingFine, setPayingFine] = useState(false)

  // ─────────────────────────────────────────────
  // REAL-TIME BOOKING SUBSCRIPTION
  // ─────────────────────────────────────────────
  useEffect(() => {
    let unsubscribeBookings = null
    let unsubscribePenalty = null

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeBookings) { unsubscribeBookings(); unsubscribeBookings = null }
      if (unsubscribePenalty) { unsubscribePenalty(); unsubscribePenalty = null }

      if (!user) {
        setLoading(false)
        setBookings([])
        setPenaltyData(null)
        return
      }

      // Detect and process past misses on mount
      detectAndProcessMisses(user.uid).catch(err =>
        console.error("Miss detection error:", err)
      )

      // Real-time listener on bookings
      const q = query(
        collection(db, "bookings"),
        where("studentId", "==", user.uid)
      )

      unsubscribeBookings = onSnapshot(q, (snapshot) => {
        const myBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        myBookings.sort((a, b) => (b.bookedAt?.seconds || 0) - (a.bookedAt?.seconds || 0))
        setBookings(myBookings)
        setLoading(false)
      }, (error) => {
        console.error("❌ Error in bookings snapshot:", error)
        setLoading(false)
      })

      // Real-time listener on penalty data
      unsubscribePenalty = subscribeStudentPenalty(user.uid, (data) => {
        setPenaltyData(data)
      })
    })

    return () => {
      unsubscribeAuth()
      if (unsubscribeBookings) unsubscribeBookings()
      if (unsubscribePenalty) unsubscribePenalty()
    }
  }, [])

  // ─────────────────────────────────────────────
  // CANCEL BOOKING (hard-delete)
  // ─────────────────────────────────────────────
  const handleCancel = async () => {
    if (!selectedTicket) return
    setCancelLoading(true)
    try {
      await cancelBooking(selectedTicket.id)
      setToastType("success")
      setToastMessage("Booking cancelled successfully")
      setShowToast(true)
    } catch (err) {
      setToastType("danger")
      setToastMessage(err.message)
      setShowToast(true)
    } finally {
      setCancelLoading(false)
      setShowCancelModal(false)
      setSelectedTicket(null)
    }
  }

  // ─────────────────────────────────────────────
  // PAY FINE (simulated)
  // ─────────────────────────────────────────────
  const handlePayFine = async () => {
    const user = auth.currentUser
    if (!user) return
    setPayingFine(true)
    try {
      await payFine(user.uid)
      setToastType("success")
      setToastMessage("Fine paid successfully! You can book again.")
      setShowToast(true)
    } catch (err) {
      setToastType("danger")
      setToastMessage(err.message)
      setShowToast(true)
    } finally {
      setPayingFine(false)
    }
  }

  // ── Derived penalty state ──
  const blocked = penaltyData ? isStudentBlocked(penaltyData, serverTime) : false
  const lockEnd = penaltyData ? getLockEndDate(penaltyData) : null

  return (
    <PageWrapper role="student">
      <h1 className="text-2xl font-bold text-vitblue mb-6">My Bookings</h1>

      {/* ── PENALTY STATS CARD ── */}
      {penaltyData && (
        <div className="max-w-2xl mx-auto mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Booking History</h3>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-2xl font-extrabold text-gray-800">{penaltyData.totalBookings || 0}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Bookings</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-green-600">{penaltyData.totalClaims || 0}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Claims</p>
              </div>
              <div>
                <p className={`text-2xl font-extrabold ${(penaltyData.consecutiveMisses || 0) > 0 ? "text-red-600" : "text-gray-800"}`}>
                  {penaltyData.consecutiveMisses || 0}
                </p>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Misses</p>
              </div>
              <div>
                <p className={`text-2xl font-extrabold ${(penaltyData.consecutiveCancels || 0) > 0 ? "text-orange-600" : "text-gray-800"}`}>
                  {penaltyData.consecutiveCancels || 0}
                </p>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Cancels</p>
              </div>
            </div>

            {/* Miss Warning */}
            {(penaltyData.consecutiveMisses || 0) > 0 && !blocked && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <span className="text-amber-600 text-sm">⚠️</span>
                <p className="text-xs font-semibold text-amber-700">
                  {penaltyData.consecutiveMisses} / {MISS_THRESHOLD} consecutive misses.
                  {" "}{MISS_THRESHOLD - penaltyData.consecutiveMisses} more will result in a block.
                </p>
              </div>
            )}

            {/* Cancel Warning */}
            {(penaltyData.consecutiveCancels || 0) > 0 && !blocked && (
              <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <span className="text-orange-600 text-sm">⚠️</span>
                <p className="text-xs font-semibold text-orange-700">
                  {penaltyData.consecutiveCancels} / {CANCEL_THRESHOLD} consecutive cancels.
                  {" "}{CANCEL_THRESHOLD - penaltyData.consecutiveCancels} more will result in a block.
                </p>
              </div>
            )}

            {/* BLOCKED + FINE */}
            {blocked && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <span className="text-red-600 text-lg">🚫</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-red-700">Account Temporarily Locked</p>
                    <p className="text-xs text-red-500 mt-1">
                      Blocked due to excessive missed/cancelled bookings. Disabled until{" "}
                      {lockEnd ? lockEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : "lock expires"}.
                    </p>
                    {(penaltyData.fineDue || 0) > 0 && (
                      <div className="mt-3 flex items-center gap-3">
                        <span className="text-sm font-bold text-red-700">Fine: ₹{penaltyData.fineDue}</span>
                        <button
                          onClick={handlePayFine}
                          disabled={payingFine}
                          className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 transition disabled:opacity-50"
                        >
                          {payingFine ? "Processing..." : `Pay ₹${penaltyData.fineDue}`}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {loading || !timeLoaded ? (
        <div className="text-center py-20 animate-pulse">Loading...</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed">
          <p className="text-gray-500">No active bookings.</p>
        </div>
      ) : (
        <div className="space-y-6 max-w-2xl mx-auto">
          {bookings.map((ticket) => {
            const status = getBookingStatus(ticket)
            const badge = STATUS_BADGE[status]
            const cutoff = getTimeUntilCutoff(ticket.date, ticket.time, serverTime)
            const journeyStatus = getJourneyStatus(ticket.date, ticket.time, serverTime)
            const journeyBadge = JOURNEY_BADGE[journeyStatus]

            const isBooked = status === BookingStatus.BOOKED
            const isClaimed = status === BookingStatus.CLAIMED
            const canTrack = isClaimed && journeyStatus === JourneyStatus.DEPARTED

            return (
              <div key={ticket.id} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 flex flex-col md:flex-row">
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">DESTINATION</p>
                        <h2 className="text-2xl font-extrabold mt-1 text-vitblue">
                          {ticket.busDetails?.route || ticket.route || "Bus Route"}
                        </h2>
                      </div>
                      {badge && (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border flex items-center gap-1.5 ${badge.bg} ${badge.text} ${badge.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                          {badge.label}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase">Time</p>
                        <p className="font-semibold text-gray-700 mt-1">
                          {ticket.time || formatDate(ticket.bookedAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase">Date</p>
                        <p className="font-mono text-gray-600 mt-1">{ticket.date}</p>
                      </div>
                    </div>

                    {isBooked && cutoff && (
                      <div className="mt-4 bg-blue-50 rounded-lg px-3 py-2 flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-500 uppercase">Booking closes in</span>
                        <span className="font-mono font-bold text-blue-700 text-sm">
                          {formatCountdown(cutoff)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* BOOKED actions */}
                  {isBooked && (
                    <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                      <button
                        onClick={() =>
                          navigate("/student/seat-claim", {
                            state: {
                              bookingId: ticket.id,
                              busId: ticket.shuttleId,
                              seatNumber: ticket.seatNumber,
                              route: ticket.route,
                              gpsId: ticket.gpsId || "bus1",
                              time: ticket.time,
                              date: ticket.date
                            }
                          })
                        }
                        className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-600 transition"
                      >
                        Claim Seat
                      </button>
                      <button
                        onClick={() => { setSelectedTicket(ticket); setShowCancelModal(true) }}
                        disabled={cancelLoading}
                        className="text-red-500 text-sm font-bold hover:text-red-700 hover:underline disabled:opacity-50"
                      >
                        Cancel Booking
                      </button>
                    </div>
                  )}

                  {/* CLAIMED — Journey Status + Actions */}
                  {isClaimed && (
                    <div className="mt-6 pt-4 border-t border-gray-100 space-y-3">
                      {journeyBadge && (
                        <div className={`rounded-lg px-3 py-2 flex items-center gap-2 border ${journeyBadge.bg} ${journeyBadge.border}`}>
                          <span className="text-base">{journeyBadge.icon}</span>
                          <div>
                            <p className={`text-sm font-semibold ${journeyBadge.text}`}>{journeyBadge.label}</p>
                            <p className={`text-xs ${journeyBadge.text} opacity-75`}>{journeyBadge.message}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        {canTrack ? (
                          <button
                            onClick={() =>
                              navigate("/student/live-tracking", {
                                state: {
                                  bookingId: ticket.id,
                                  gpsId: ticket.gpsId || "bus1",
                                  route: ticket.route,
                                  time: ticket.time,
                                  date: ticket.date,
                                  seatNumber: ticket.seatNumber,
                                }
                              })
                            }
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition flex items-center gap-1.5"
                          >
                            📍 Live Tracking
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            Tracking available after departure
                          </span>
                        )}
                        <button
                          onClick={() => { setSelectedTicket(ticket); setShowCancelModal(true) }}
                          disabled={cancelLoading}
                          className="text-red-500 text-sm font-bold hover:text-red-700 hover:underline disabled:opacity-50"
                        >
                          Cancel Booking
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Side — Seat Number */}
                <div className={`p-6 text-white flex flex-col items-center justify-center min-w-[120px] ${
                  isBooked ? "bg-vitblue" : isClaimed ? "bg-purple-600" : "bg-gray-400"
                }`}>
                  <p className="text-xs font-bold opacity-80 uppercase tracking-widest mb-1">SEAT</p>
                  <span className="text-5xl font-extrabold tracking-tighter">{ticket.seatNumber || "?"}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmModal
        open={showCancelModal}
        title="Cancel Booking?"
        message="Are you sure you want to cancel this booking? This action cannot be undone."
        confirmText="Yes, Cancel"
        cancelText="Keep Booking"
        type="danger"
        onConfirm={handleCancel}
        onCancel={() => setShowCancelModal(false)}
      />

      <Toast
        show={showToast}
        message={toastMessage}
        type={toastType}
        onClose={() => setShowToast(false)}
      />

    </PageWrapper>
  )
}

export default StudentBooking
