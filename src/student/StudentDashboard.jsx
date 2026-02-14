import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "../config/firebase"
import PageWrapper from "../components/layout/PageWrapper"

// Icon components
const BusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7l4-4m0 0l4 4m-4-4v18" />
  </svg>
)

const ChevronDownIcon = () => (
  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
  </svg>
)

function StudentDashboard() {
  const [shuttles, setShuttles] = useState([])
  const [busMap, setBusMap] = useState({})
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [selectedRoute, setSelectedRoute] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  
  const navigate = useNavigate()

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0]

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      console.log("🔄 Fetching shuttles for date:", today)

      const shuttlesRef = collection(db, "shuttles")

      // Only filter by date to get everything for today
      const shuttleQuery = query(
        shuttlesRef,
        where("date", "==", today) 
      )

      const shuttleSnap = await getDocs(shuttleQuery)
      console.log("✅ Found Shuttles:", shuttleSnap.docs.length)

      const shuttleList = shuttleSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // Get All Buses
      const busesRef = collection(db, "buses")
      const busesSnap = await getDocs(busesRef)
      
      const map = {}
      busesSnap.forEach(doc => {
        map[doc.id] = doc.data()
      })

      setBusMap(map)
      setShuttles(shuttleList)
    } catch (err) {
      console.error("❌ Error fetching data:", err)
    } finally {
      setLoading(false)
    }
  }

  // Generate Filter Options
  const routes = [...new Set(shuttles.map(s => s.route))]
  const times = [...new Set(shuttles.map(s => s.time))].sort()

  // Apply Filters
  const filtered = shuttles.filter(s => {
    const routeOk = selectedRoute ? s.route === selectedRoute : true
    const timeOk = selectedTime ? s.time === selectedTime : true
    return routeOk && timeOk
  })

  if (loading) {
    return (
      <PageWrapper role="student">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="w-12 h-12 border-4 border-vitblue border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium animate-pulse">Scanning for available shuttles...</p>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper role="student">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Available Shuttles
          </h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Filters Grid - ✅ CHANGED: Back to grid-cols-1 (Vertical Stack) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          
          {/* Route Dropdown */}
          <div className="relative w-full">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Route</label>
            <div className="relative w-full">
              <select
                value={selectedRoute}
                onChange={e => setSelectedRoute(e.target.value)}
                // ✅ FIX: Added 'w-full' and 'truncate' to keep it inside the screen
                className="appearance-none w-full bg-gray-50 border-none ring-1 ring-gray-200 rounded-xl py-3 pl-3 pr-8 focus:ring-2 focus:ring-vitblue outline-none text-gray-800 font-bold text-sm truncate"
              >
                <option value="">All Destinations</option>
                {routes.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              {/* Custom Arrow */}
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                <ChevronDownIcon />
              </div>
            </div>
          </div>

          {/* Time Dropdown */}
          <div className="relative w-full">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Departure Time</label>
            <div className="relative w-full">
              <select
                value={selectedTime}
                onChange={e => setSelectedTime(e.target.value)}
                // ✅ FIX: Added 'w-full' and 'truncate' here too
                className="appearance-none w-full bg-gray-50 border-none ring-1 ring-gray-200 rounded-xl py-3 pl-3 pr-8 focus:ring-2 focus:ring-vitblue outline-none text-gray-800 font-bold text-sm truncate"
              >
                <option value="">Any Time</option>
                {times.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {/* Custom Arrow */}
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                <ChevronDownIcon />
              </div>
            </div>
          </div>

        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between mb-4 px-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
            {filtered.length} Buses Found
          </p>
          {(selectedRoute || selectedTime) && (
            <button
              onClick={() => { setSelectedRoute(""); setSelectedTime("") }}
              className="text-xs text-vitblue font-bold hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Shuttle Cards - Single Column for Mobile (List View) */}
        <div className="flex flex-col gap-4 pb-10">
          {filtered.length === 0 ? (
            <div className="bg-gray-50 rounded-3xl py-12 px-4 text-center border-2 border-dashed border-gray-200">
              <div className="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">🚌</span>
              </div>
              <h3 className="text-base font-bold text-gray-800">No buses found</h3>
              <p className="text-gray-500 text-sm mt-1">
                Try changing your filters.
              </p>
            </div>
          ) : (
            filtered.map(shuttle => {
                const bus = busMap[shuttle.busId] || { 
                    busNo: "Unknown", 
                    numberPlate: "---", 
                    driver: { name: "N/A" } 
                }

              return (
                <div
                  key={shuttle.id}
                  className="group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="hidden sm:flex bg-blue-50 text-vitblue w-12 h-12 rounded-xl items-center justify-center">
                      <BusIcon />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-extrabold text-lg text-gray-900 leading-tight">
                        {shuttle.route}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border border-gray-200">
                          {bus.busNo}
                        </span>
                        <span className="text-gray-300 text-xs">|</span>
                        <span className="text-gray-500 font-mono text-xs">{bus.numberPlate}</span>
                      </div>

                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center text-gray-600 text-sm font-medium">
                          <span className="mr-1.5 text-gray-400">🕒</span>
                          {shuttle.time}
                        </div>
                        <div className="flex items-center text-gray-600 text-sm font-medium">
                          <span className="mr-1.5 text-gray-400">👤</span>
                          {bus.driver?.name || "Assigning..."}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Select Button - Full width on mobile */}
                  <div className="pt-2">
                    <button
                      onClick={() => navigate(`/student/seat-layout/${shuttle.id}`, {
                        state: {
                          route: shuttle.route,
                          time: shuttle.time
                        }
                      })}
                      className="w-full bg-vitblue text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-blue-100 active:scale-[0.98] transition-all"
                    >
                      Select Seat
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </PageWrapper>
  )
}

export default StudentDashboard