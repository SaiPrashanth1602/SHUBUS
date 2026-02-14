import { useEffect, useState } from "react"
import { doc, getDoc } from "firebase/firestore" 
import { db } from "../config/firebase" // Need db to look up users
import PageWrapper from "../components/layout/PageWrapper"
import { getAllBookings } from "../services/bookingServices"

// Helper to format date nicely
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
  const [routeFilter, setRouteFilter] = useState("All")


  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Get all bookings first
        const rawBookings = await getAllBookings()
        
        // 2. For each booking, fetch the Student Details from 'users' collection
        const enrichedBookings = await Promise.all(
          rawBookings.map(async (booking) => {
            let studentInfo = "Unknown"
            
            try {
              // The booking.studentId SHOULD be the Auth UID (e.g., VWps...)
              if (booking.studentId) {
                const userDocRef = doc(db, "users", booking.studentId)
                const userSnap = await getDoc(userDocRef)
                
                if (userSnap.exists()) {
                  const userData = userSnap.data()
                  // 🚨 CHECK WITH SUJAN: Is it 'regNo', 'registerNumber', or 'username'?
                  studentInfo = userData.regNo || userData.registerNumber || userData.email || "No RegNo"
                }
              }
            } catch (err) {
              console.error("Error fetching user:", err)
            }

            // Return the booking combined with the new student info
            return { ...booking, displayId: studentInfo }
          })
        )

        // 3. Sort by newest first
        const sorted = enrichedBookings.sort((a, b) => b.bookedAt - a.bookedAt)
        setBookings(sorted)

      } catch (error) {
        console.error("Failed to load bookings", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])
  const routes = [
  "All",
  ...Array.from(
    new Set(
      bookings
        ?.map(b => b.busDetails?.route)
        ?.filter(Boolean)
    )
  )
]


const filteredBookings = bookings.filter(b => {
  const regNo = (b.displayId || "").toLowerCase()
  const seat = String(b.seatNumber || "")
  const route = b.busDetails?.route || ""

  const matchesSearch =
    regNo.includes(search.toLowerCase()) ||
    seat.includes(search)

  const matchesRoute =
    routeFilter === "All" || route === routeFilter

  return matchesSearch && matchesRoute
})



  return (
    <PageWrapper role="admin">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-vitblue">Student Bookings</h1>
        <div className="bg-blue-50 text-vitblue px-4 py-2 rounded-lg font-bold">
          Total: {bookings.length}
        </div>
      </div>
      {/* SEARCH + FILTER */}
<div className="flex flex-col md:flex-row gap-3 mb-4">

  {/* SEARCH */}
  <input
    type="text"
    placeholder="Search RegNo or Seat No..."
    value={search}
    onChange={e => setSearch(e.target.value)}
    className="border p-3 rounded-xl w-full md:w-64"
  />

  {/* ROUTE FILTER */}
  <select
    value={routeFilter}
    onChange={e => setRouteFilter(e.target.value)}
    className="border p-3 rounded-xl w-full md:w-56"
  >
    {routes.map(route => (
      <option key={route} value={route}>
        {route}
      </option>
    ))}
  </select>

</div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4">Student RegNo</th>
                <th className="p-4">Route</th>
                <th className="p-4">Seat No</th>
                <th className="p-4">Booked At</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="5" className="p-6 text-center text-gray-500">Loading records...</td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan="5" className="p-6 text-center text-gray-500">No bookings found.</td></tr>
              ) : (
                filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-blue-50/50 transition-colors">
                    {/* ✅ This now shows the REAL Register Number from 'users' db */}
                    <td className="p-4 font-mono text-vitblue font-bold">
                      {booking.displayId}
                    </td>
                    <td className="p-4 text-gray-700">
                      {booking.busDetails?.route || "Unknown Route"}
                    </td>
                    <td className="p-4 font-bold text-gray-900">
                      {booking.seatNumber}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {formatDate(booking.bookedAt)}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase
                        ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}
                      `}>
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageWrapper>
  )
}

export default ViewBookings