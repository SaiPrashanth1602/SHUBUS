import { useEffect, useState } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { auth, db } from "../config/firebase"
import { onAuthStateChanged } from "firebase/auth" // 👈 Added Listener Import
import PageWrapper from "../components/layout/PageWrapper"

// Helper to format timestamps nicely
const formatDate = (timestamp) => {
  if (!timestamp) return "Date Pending"
  // Handle both Firestore Timestamp and standard Date strings
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleString('en-IN', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function StudentBooking() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 🛡️ REFRESH FIX: Use a listener instead of a one-time check
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      
      // 1. If user is NOT logged in (or just logged out)
      if (!user) {
          console.log("❌ No user logged in")
          setLoading(false)
          setBookings([]) // Clear data
          return
      }

      // 2. User IS logged in -> Fetch Data
      console.log("🔄 User confirmed:", user.uid)
      
      try {
        const q = query(
          collection(db, "bookings"),
          where("studentId", "==", user.uid)
        )
        
        const snapshot = await getDocs(q)
        console.log("✅ Found Bookings:", snapshot.docs.length)

        const myBookings = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        // Sort them (Newest first)
        myBookings.sort((a, b) => {
            const timeA = a.bookedAt?.seconds || 0
            const timeB = b.bookedAt?.seconds || 0
            return timeB - timeA
        })

        setBookings(myBookings)
      } catch (error) {
        console.error("❌ Error fetching bookings:", error)
      } finally {
        setLoading(false)
      }
    })

    // Cleanup: Stop listening when component unmounts
    return () => unsubscribe()
  }, [])

  return (
    <PageWrapper role="student">
      <h1 className="text-2xl font-bold text-vitblue mb-6">My Bookings</h1>

      {loading ? (
        <div className="text-center py-20 flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-vitblue border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 text-lg animate-pulse">Loading your tickets...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">No active bookings found.</p>
          <a href="/student" className="text-vitblue font-bold hover:underline mt-2 inline-block">
            Book a Seat Now
          </a>
        </div>
      ) : (
        <div className="space-y-6 max-w-2xl mx-auto">
          {bookings.map((ticket) => (
            <div 
                key={ticket.id} 
                className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 flex flex-col md:flex-row transition-transform hover:-translate-y-1"
            >
              {/* Left Side: Route Info */}
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">DESTINATION</p>
                        <h2 className="text-2xl font-extrabold text-vitblue mt-1">
                            {/* Safety Check: If route is missing, show Fallback */}
                            {ticket.busDetails?.route || ticket.route || "Bus Route"}
                        </h2>
                    </div>
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                        {ticket.status || "Booked"}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                        <p className="text-xs text-gray-400 font-bold uppercase">DATE & TIME</p>
                        <p className="font-semibold text-gray-700 mt-1">
                            {formatDate(ticket.bookedAt)}
                        </p>
                    </div>
                    <div>
                          <p className="text-xs text-gray-400 font-bold uppercase">BUS ID</p>
                          <p className="font-mono text-gray-600 mt-1">
                            {/* Shorten the shuttle ID for display */}
                            {(ticket.shuttleId || ticket.busId || "---").substring(0, 6).toUpperCase()}
                          </p>
                    </div>
                </div>
              </div>

              {/* Right Side: Seat Number (Ticket Stub Look) */}
              <div className="bg-vitblue p-6 text-white flex flex-col items-center justify-center min-w-[120px] md:border-l-2 border-dashed border-white/30 relative">
                {/* Visual decorative circles for "tear-off" effect */}
                <div className="absolute -top-3 -left-3 w-6 h-6 bg-gray-100 rounded-full"></div>
                <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-gray-100 rounded-full"></div>

                <p className="text-xs font-bold opacity-80 uppercase tracking-widest mb-1">SEAT</p>
                <span className="text-5xl font-extrabold tracking-tighter">
                    {ticket.seatNumber || ticket.busDetails?.seatNumber || "?"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageWrapper>
  )
}

export default StudentBooking
