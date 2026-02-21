import { useEffect, useState } from "react"
import { doc, getDoc } from "firebase/firestore" 
import { db } from "../config/firebase" 
import PageWrapper from "../components/layout/PageWrapper"
import { getAllBookings } from "../services/bookingServices"
import { MapPin, Clock, Armchair, CalendarCheck, SearchX, ArrowUp } from "lucide-react"

const formatDate = (timestamp) => {
  if (!timestamp) return "N/A"
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleString('en-IN', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

function ViewBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showScrollTop, setShowScrollTop] = useState(false) // State for the button

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    const loadData = async () => {
      try {
        const rawBookings = await getAllBookings()
        const enrichedBookings = await Promise.all(
          rawBookings.map(async (booking) => {
            let studentInfo = "Unknown"
            try {
              if (booking.studentId) {
                const userDocRef = doc(db, "users", booking.studentId)
                const userSnap = await getDoc(userDocRef)
                if (userSnap.exists()) {
                  const userData = userSnap.data()
                  studentInfo = userData.regNo || userData.registerNumber || userData.email || "No RegNo"
                }
              }
            } catch (err) { console.error("Error fetching user:", err) }
            return { ...booking, displayId: studentInfo }
          })
        )
        const sorted = enrichedBookings.sort((a, b) => {
            const dateA = a.bookedAt?.toDate ? a.bookedAt.toDate() : new Date(a.bookedAt)
            const dateB = b.bookedAt?.toDate ? b.bookedAt.toDate() : new Date(b.bookedAt)
            return dateB - dateA
        })
        setBookings(sorted)
      } catch (error) {
        console.error("Failed to load bookings", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const filteredBookings = bookings.filter(b => {
    const query = search.toLowerCase().trim()
    if (!query) return true
    const regNo = (b.displayId || "").toLowerCase()
    const route = (b.route || b.busDetails?.route || "").toLowerCase()
    const departureTime = (b.time || b.busDetails?.time || "").toLowerCase() 
    const status = (b.status || "").toLowerCase()
    return regNo.includes(query) || route.includes(query) || departureTime.includes(query) || status.includes(query)
  })

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <PageWrapper role="admin">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Student Bookings</h1>
            <p className="text-slate-500 text-sm mt-1">Real-time seat reservation logs</p>
        </div>
        <div className="bg-blue-50 text-vitblue px-5 py-2.5 rounded-xl font-black shadow-sm border border-blue-100 flex items-center gap-2">
           <CalendarCheck size={18} />
           Total: {bookings.length}
        </div>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search Reg No, Route, Departure Time..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full md:w-[450px] p-4 rounded-2xl border border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-vitblue outline-none transition-all"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[450px]">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead className="bg-gray-50 text-gray-400 font-bold text-[10px] uppercase tracking-widest border-b border-gray-100">
              <tr>
                <th className="p-5 pl-8">Student RegNo</th>
                <th className="p-5">Route & Time</th>
                <th className="p-4">Seat</th>
                <th className="p-5">Booked At</th>
                <th className="p-5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan="5" className="p-20 text-center text-gray-400 animate-pulse font-medium">Fetching secure records...</td></tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-24 px-4 text-center align-middle">
                    <div className="flex flex-col items-center justify-center w-full">
                        <SearchX size={48} className="text-gray-200 mb-4" />
                        <p className="text-gray-500 font-bold text-lg leading-tight">No reservation records found</p>
                        <p className="text-gray-400 text-sm mt-2 max-w-[200px]">Try a different Reg No, Route or Departure Time</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-blue-50/40 transition-colors group">
                    <td className="p-5 pl-8">
                      <span className="font-bold text-gray-900 font-mono tracking-tight text-sm">{booking.displayId}</span>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 text-vitblue font-bold text-sm">
                            <MapPin size={14} />
                            {booking.route || booking.busDetails?.route || "Unknown Route"}
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-400 text-xs mt-1 font-semibold">
                            <Clock size={12} />
                            Departure: {booking.time || booking.busDetails?.time || "N/A"}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 w-fit px-3 py-1.5 rounded-lg">
                        <Armchair size={14} className="text-slate-400" />
                        <span className="font-black text-gray-700">{booking.seatNumber}</span>
                      </div>
                    </td>
                    <td className="p-5 text-xs font-medium text-gray-500">{formatDate(booking.bookedAt)}</td>
                    <td className="p-5 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border
                        ${(booking.status === 'confirmed' || booking.status === 'CONFIRMED') 
                          ? 'bg-green-100 text-green-700 border-green-200' 
                          : (booking.status === 'claimed' || booking.status === 'CLAIMED')
                            ? 'bg-purple-100 text-purple-700 border-purple-200 shadow-sm' 
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }
                      `}>{booking.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✨ BACK TO TOP BUTTON */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 bg-vitblue text-white p-4 rounded-2xl shadow-2xl hover:bg-blue-800 transition-all animate-in fade-in zoom-in slide-in-from-bottom-4 duration-300 z-[60]"
          title="Back to Top"
        >
          <ArrowUp size={24} />
        </button>
      )}
    </PageWrapper>
  )
}

export default ViewBookings