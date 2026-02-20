import { useEffect, useState } from "react"
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore"
import { auth, db } from "../config/firebase"
import { onAuthStateChanged } from "firebase/auth"
import PageWrapper from "../components/layout/PageWrapper"
import { useNavigate } from "react-router-dom";
import { runTransaction } from "firebase/firestore"
import ConfirmModal from "../components/ui/ConfirmModal"
import Toast from "../components/ui/Toast"

// Helper to format timestamps nicely
const formatDate = (timestamp) => {
  if (!timestamp) return "Date Pending"
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleString('en-IN', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

// ✨ NEW: Helper to check if a specific ticket time has already passed
const isTicketExpired = (ticketDate, ticketTime) => {
  if (!ticketDate || !ticketTime) return false;
  
  try {
    const [yearStr, monthStr, dayStr] = ticketDate.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1; 
    const day = parseInt(dayStr, 10);

    const [hoursStr, minutesStr] = ticketTime.split(":");
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (hours < 12) hours += 12; // Convert to 24-hour PM time

    const departureTime = new Date(year, month, day, hours, minutes);
    const now = new Date();
    
    return now > departureTime;
  } catch (error) {
    return false; // If date parsing fails, default to false so they don't lose the ticket
  }
}

function StudentBooking() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [toastType, setToastType] = useState("success")
  const [showToast, setShowToast] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)

  // 🇮🇳 FORCE IST DATE (YYYY-MM-DD)
  const offset = 5.5 * 60 * 60 * 1000; // IST Offset
  const now = new Date();
  const todayStr = new Date(now.getTime() + offset).toISOString().split('T')[0];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false)
        setBookings([])
        return
      }

      try {
        const q = query(
          collection(db, "bookings"),
          where("studentId", "==", user.uid)
        )
        const snapshot = await getDocs(q)
        const myBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

        // Sort: Newest first
        myBookings.sort((a, b) => (b.bookedAt?.seconds || 0) - (a.bookedAt?.seconds || 0))
        setBookings(myBookings)
      } catch (error) {
        console.error("❌ Error fetching bookings:", error)
      } finally {
        setLoading(false)
      }
    })
    return () => unsubscribe()
  }, [])

  const handleCancel = async () => {
    if (!selectedTicket) return

    setCancelLoading(true)

    try {
      const shuttleRef = doc(db, "shuttles", selectedTicket.shuttleId)
      const bookingRef = doc(db, "bookings", selectedTicket.id)

      await runTransaction(db, async (transaction) => {
        const shuttleSnap = await transaction.get(shuttleRef)
        const bookingSnap = await transaction.get(bookingRef)

        if (!bookingSnap.exists()) throw new Error("Booking not found")

        const bookingData = bookingSnap.data()
        if (bookingData.status !== "confirmed") {
          throw new Error("Booking already cancelled")
        }

        transaction.delete(bookingRef)

        if (shuttleSnap.exists()) {
          const currentBooked = shuttleSnap.data().bookedSeats || 0
          transaction.update(shuttleRef, {
            bookedSeats: Math.max(0, currentBooked - 1)
          })
        }
      })

      // Smooth card fade-out
      setBookings(prev => prev.filter(b => b.id !== selectedTicket.id))

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
    }
  }

  return (
    <PageWrapper role="student">
      <h1 className="text-2xl font-bold text-vitblue mb-6">My Bookings</h1>

      {loading ? (
        <div className="text-center py-20 animate-pulse">Loading...</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed">
          <p className="text-gray-500">No active bookings.</p>
        </div>
      ) : (
        <div className="space-y-6 max-w-2xl mx-auto">
          {bookings.map((ticket) => {

            const isClaimed = ticket.claimed === true;
            
            // ✨ FIX: Smart status check
            // Ticket is "Active" ONLY if the departure time hasn't passed yet
            const isExpired = isTicketExpired(ticket.date, ticket.time);
            const isFutureOrToday = !isExpired; // If it's not expired, it's active!

            const statusLabel = isFutureOrToday ? "Active" : "Past";
            const statusColor = isFutureOrToday ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500";

            return (
              <div key={ticket.id} className={`bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 flex flex-col md:flex-row ${isExpired ? "opacity-80 grayscale-[20%]" : ""}`}>
                {/* Left Side */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">DESTINATION</p>
                        <h2 className={`text-2xl font-extrabold mt-1 ${isExpired ? "text-gray-500" : "text-vitblue"}`}>
                          {ticket.busDetails?.route || ticket.route || "Bus Route"}
                        </h2>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${statusColor}`}>
                        {statusLabel}
                      </span>
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
                        <p className="font-mono text-gray-600 mt-1">
                          {ticket.date}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 🔴 ACTION BUTTONS (Only visible if the ticket is NOT expired) */}
                  {isFutureOrToday && (
                    <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">

                      {/* Claim Seat Button */}
                      {!isClaimed && (
                        <button
                          onClick={() =>
                            navigate("/student/seat-claim", {
                              state: {
                                bookingId: ticket.id,
                                busId: ticket.shuttleId,
                                seatNumber: ticket.seatNumber,
                                route: ticket.route,
                                gpsId: ticket.gpsId,
                                time: ticket.time,
                                date: ticket.date // Passing this along just in case
                              }
                            })
                          }
                          className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-600 transition"
                        >
                          Claim Seat
                        </button>
                      )}

                      {isClaimed && (
                        <span className="text-sm font-bold text-green-600">
                          ✅ Seat Claimed
                        </span>
                      )}

                      {/* Cancel Button */}
                      <button
                        onClick={() => {
                          setSelectedTicket(ticket)
                          setShowCancelModal(true)
                        }}
                        disabled={cancelLoading}
                        className="text-red-500 text-sm font-bold hover:text-red-700 hover:underline disabled:opacity-50"
                      >
                        Cancel Booking
                      </button>

                    </div>
                  )}

                  {/* Message for Past Tickets */}
                  {isExpired && (
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <p className="text-sm font-semibold text-gray-400 italic">
                        {isClaimed ? "✅ Journey Completed" : "❌ Ticket Expired"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Side */}
                <div className={`p-6 text-white flex flex-col items-center justify-center min-w-[120px] ${isFutureOrToday ? "bg-vitblue" : "bg-gray-400"}`}>
                  <div className="absolute -top-3 -left-3 w-6 h-6 bg-gray-100 rounded-full"></div>
                  <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-gray-100 rounded-full"></div>
                  <p className="text-xs font-bold opacity-80 uppercase tracking-widest mb-1">SEAT</p>
                  <span className="text-5xl font-extrabold tracking-tighter">{ticket.seatNumber || "?"}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
      
      {/* Cancel Confirmation Modal */}
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
