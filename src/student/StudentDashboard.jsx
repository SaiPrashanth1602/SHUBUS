import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth" 
import { db, auth } from "../config/firebase" 
import PageWrapper from "../components/layout/PageWrapper"
import { CalendarClock } from "lucide-react" 

// ✨ NEW: Smart date helper — after 3 PM (or 12 PM for testing), flip to tomorrow!
const getActiveDate = () => {
  const now = new Date()
  if (now.getHours() >= 15) { // Change back to 15 when done testing!
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split("T")[0]
  }
  return now.toISOString().split("T")[0]
}

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
  
  // User Profile State
  const [userData, setUserData] = useState(null)
  const [greeting, setGreeting] = useState("")

  // Filters
  const [selectedRoute, setSelectedRoute] = useState("")
  const [selectedTime, setSelectedTime] = useState("")

  const navigate = useNavigate()
  
  // Smart dates instead of hardcoded 'today'
  const activeDate = getActiveDate()
  const isSchedulingForTomorrow = new Date().getHours() >= 15 // Change back to 15 when done testing!

  // ✨ FIX: Top greeting always shows the actual CURRENT date normally
  const currentDateDisplay = new Date().toLocaleDateString('en-IN', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  })

  useEffect(() => {
    // --- Authentication & User Data Fetching ---
    const hour = new Date().getHours()
    if (hour < 12) setGreeting("Good Morning")
    else if (hour < 18) setGreeting("Good Afternoon")
    else setGreeting("Good Evening")

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid)
        const userDocSnap = await getDoc(userDocRef)
        if (userDocSnap.exists()) {
          setUserData(userDocSnap.data())
        }
      } else {
        setUserData(null)
      }
    })

    // --- Shuttle and Bus Fetching ---
    const shuttlesRef = collection(db, "shuttles")
    const shuttleQuery = query(
      shuttlesRef,
      where("date", "==", activeDate), 
      where("active", "==", true)
    )

    const unsubscribeShuttles = onSnapshot(shuttleQuery, (snapshot) => {
      const shuttleList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setShuttles(shuttleList)
    })

    const busesRef = collection(db, "buses")
    const busQuery = query(busesRef, where("active", "==", true))

    const unsubscribeBuses = onSnapshot(busQuery, (snapshot) => {
      const map = {}
      snapshot.forEach(doc => {
        map[doc.id] = doc.data()
      })
      setBusMap(map)
      setLoading(false)
    })

    return () => {
      unsubscribeShuttles()
      unsubscribeBuses()
      unsubscribeAuth() 
    }
  }, [activeDate]) 

  // ==========================================
  // Smart Filtering Logic
  // ==========================================
  const allowedShuttles = useMemo(() => {
    if (!userData || Object.keys(busMap).length === 0) return []
    
    return shuttles.filter(shuttle => {
      const bus = busMap[shuttle.busId]
      if (!bus) return false
      return bus.busType === userData.busType
    })
  }, [shuttles, busMap, userData])

  const routes = [...new Set(allowedShuttles.map(s => s.route))]
  const times = [...new Set(allowedShuttles.map(s => s.time))].sort()

  const filtered = allowedShuttles.filter(s => {
    const routeOk = selectedRoute ? s.route === selectedRoute : true
    const timeOk = selectedTime ? s.time === selectedTime : true
    return routeOk && timeOk
  })

  if (loading || !userData) {
    return (
      <PageWrapper role="student">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium animate-pulse">Scanning for available shuttles...</p>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper role="student">
      <div className="max-w-5xl mx-auto">
        
        {/* TOP GREETING BANNER */}
        <div className="mb-6 px-1">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {userData ? `${greeting}, ${userData.name.split(' ')[0]} 👋` : "Welcome! 👋"}
          </h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">
            {currentDateDisplay}
          </p>
        </div>

        {/* FILTERS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="relative w-full">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Route</label>
            <div className="relative w-full">
              <select
                value={selectedRoute}
                onChange={e => setSelectedRoute(e.target.value)}
                className="appearance-none w-full bg-gray-50 border-none ring-1 ring-gray-200 rounded-xl py-3 pl-3 pr-8 focus:ring-2 focus:ring-blue-600 outline-none text-gray-800 font-bold text-sm truncate"
              >
                <option value="">All Destinations</option>
                {routes.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                <ChevronDownIcon />
              </div>
            </div>
          </div>

          <div className="relative w-full">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Departure Time</label>
            <div className="relative w-full">
              <select
                value={selectedTime}
                onChange={e => setSelectedTime(e.target.value)}
                className="appearance-none w-full bg-gray-50 border-none ring-1 ring-gray-200 rounded-xl py-3 pl-3 pr-8 focus:ring-2 focus:ring-blue-600 outline-none text-gray-800 font-bold text-sm truncate"
              >
                <option value="">Any Time</option>
                {times.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                <ChevronDownIcon />
              </div>
            </div>
          </div>
        </div>

        {/* AVAILABLE SHUTTLES TITLE */}
        <div className="flex items-end justify-between mb-4 px-1 border-b border-gray-200 pb-2 flex-wrap gap-2">
          <h2 className="text-xl font-extrabold text-gray-800 flex items-center gap-2 flex-wrap">
            Available Shuttles
            <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-black">
              {userData.busType} Only
            </span>
            {/* ✨ FIX: Moved the Tomorrow indicator here, styled like a clean badge */}
            {isSchedulingForTomorrow && (
              <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-black flex items-center gap-1 shadow-sm">
                <CalendarClock size={12} />
                Booking for Tomorrow
              </span>
            )}
          </h2>
          <div className="text-right">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
              {filtered.length} {filtered.length === 1 ? 'Bus' : 'Buses'} Found
            </p>
            {(selectedRoute || selectedTime) && (
              <button
                onClick={() => { setSelectedRoute(""); setSelectedTime("") }}
                className="text-xs text-blue-600 font-bold hover:underline"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* SHUTTLE CARDS LIST */}
        <div className="flex flex-col gap-4 pb-10">
          {filtered.length === 0 ? (
            <div className="bg-gray-50 rounded-3xl py-12 px-4 text-center border-2 border-dashed border-gray-200">
              <div className="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">🚌</span>
              </div>
              <h3 className="text-base font-bold text-gray-800">No {userData.busType} buses found</h3>
              <p className="text-gray-500 text-sm mt-1">
                {isSchedulingForTomorrow 
                  ? "Buses for tomorrow haven't been assigned yet. Check back later!" 
                  : "Try changing your filters or checking back later."}
              </p>
            </div>
          ) : (
            filtered.map(shuttle => {
              const total = Number(shuttle.totalSeats) || 50;
              const booked = Number(shuttle.bookedSeats) || 0;
              const seatsLeft = total - booked;
              const bus = busMap[shuttle.busId] || {
                busNo: "Unknown",
                numberPlate: "---",
                driver: { name: "N/A" },
                busType: "Unknown"
              }
              
              return (
                <div
                  key={shuttle.id}
                  className="group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col gap-4 relative overflow-hidden"
                >
                  <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-bl-xl ${
                    bus.busType === "AC" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                  }`}>
                    {bus.busType}
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="hidden sm:flex bg-blue-50 text-blue-600 w-12 h-12 rounded-xl items-center justify-center">
                      <BusIcon />
                    </div>
                    <div className="flex-1 mt-1 sm:mt-0">
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

                  <div className="flex flex-col gap-3 mt-2">
                    <div>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        seatsLeft > 5
                          ? "bg-green-100 text-green-700"
                          : seatsLeft > 0
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-600"
                      }`}>
                        {seatsLeft > 0 ? `${seatsLeft} seats left` : "Full"}
                      </span>
                    </div>

                    <button
                      disabled={seatsLeft <= 0}
                      onClick={() =>
                        navigate(`/student/seat-layout/${shuttle.id}`, {
                          state: {
                            route: shuttle.route,
                            time: shuttle.time
                          }
                        })
                      }
                      className={`w-full py-3 rounded-xl font-bold text-sm shadow-md transition-all ${
                        seatsLeft > 0
                          ? "bg-blue-600 text-white active:scale-[0.98]"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {seatsLeft > 0 ? "Select Seat" : "Full"}
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
