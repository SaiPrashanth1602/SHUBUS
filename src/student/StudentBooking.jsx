import { useEffect, useState } from "react"
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore"
import { auth, db } from "../config/firebase"
import { onAuthStateChanged } from "firebase/auth"
import PageWrapper from "../components/layout/PageWrapper"

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
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  // 🇮🇳 FORCE IST DATE (YYYY-MM-DD)
  const offset = 5.5 * 60 * 60 * 1000; // IST Offset
  const now = new Date();
  const todayStr = new Date(now.getTime() + offset).toISOString().split('T')[0];

  console.log("📅 Today in IST:", todayStr) // Check your console!


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

  const handleCancel = async (ticketId) => {
    if (!window.confirm("Are you sure? Seat will be released immediately.")) return
    try {
      await deleteDoc(doc(db, "bookings", ticketId))
      setBookings(prev => prev.filter(b => b.id !== ticketId))
      alert("✅ Ticket cancelled.")
    } catch (err) {
      alert("Failed to cancel.")
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

            // 🛑 TESTING MODE: SIMPLE DATE CHECK
            // We ignore time. If date is today, show cancel button.

            const isToday = ticket.date === todayStr
            // 🐛 DEBUG LOG
            console.log("🎫 Ticket:", ticket.id)
            console.log("   - ticket.date:", ticket.date)
            console.log("   - todayStr:", todayStr)
            console.log("   - isToday:", isToday)
            console.log("---")


            // Use fallback if date is missing (e.g. old test data)
            // If no date, we assume it's NOT today to be safe, OR you can force true for testing:
            // const isToday = true 

            const statusLabel = isToday ? "Active" : "Past"
            const statusColor = isToday ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"

            return (
              <div key={ticket.id} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 flex flex-col md:flex-row">
                {/* Left Side */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">DESTINATION</p>
                        <h2 className="text-2xl font-extrabold text-vitblue mt-1">
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
                        <p className="text-xs text-gray-400 font-bold uppercase">BUS ID</p>
                        <p className="font-mono text-gray-600 mt-1">
                          {(ticket.shuttleId || ticket.busId || "---").substring(0, 6).toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 🔴 CANCEL BUTTON (Visible for ALL 'Today' tickets) */}
                  {isToday && (
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => handleCancel(ticket.id)}
                        className="text-red-500 text-sm font-bold hover:text-red-700 hover:underline flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Cancel Booking
                      </button>
                    </div>
                  )}
                </div>

                {/* Right Side */}
                <div className={`p-6 text-white flex flex-col items-center justify-center min-w-[120px] ${isToday ? "bg-vitblue" : "bg-gray-400"}`}>
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
    </PageWrapper>
  )
}

export default StudentBooking
