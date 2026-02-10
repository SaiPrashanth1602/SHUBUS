import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "../config/firebase"
import PageWrapper from "../components/layout/PageWrapper"

// Icon components for a cleaner look
const BusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7l4-4m0 0l4 4m-4-4v18" />
  </svg>
)

function BusSelection() {
  const [shuttles, setShuttles] = useState([])
  const [busMap, setBusMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedRoute, setSelectedRoute] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const navigate = useNavigate()

  const today = new Date().toISOString().split("T")[0]

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const shuttlesRef = collection(db, "shuttles")

      // 🚨 FIX IS HERE: Added where("active", "==", true)
      const shuttleQuery = query(
        shuttlesRef,
        where("date", "==", today),
        where("active", "==", true) // Only get active buses
      )

      const shuttleSnap = await getDocs(shuttleQuery)

      const shuttleList = shuttleSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      const busesRef = collection(db, "buses")
      const busesSnap = await getDocs(busesRef)

      const map = {}
      busesSnap.forEach(doc => {
        map[doc.id] = doc.data()
      })

      setBusMap(map)
      setShuttles(shuttleList)
    } catch (err) {
      console.error(err)
      // alert("Failed to load buses") // Commented out to be less annoying
    } finally {
      setLoading(false)
    }
  }

  const routes = [...new Set(shuttles.map(s => s.route))]
  const times = [...new Set(shuttles.map(s => s.time))].sort()

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
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Available Shuttles
          </h1>
          <p className="text-gray-500 mt-2 font-medium">
            Schedule for {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="relative">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Route</label>
            <select
              value={selectedRoute}
              onChange={e => setSelectedRoute(e.target.value)}
              className="w-full bg-gray-50 border-none ring-1 ring-gray-200 rounded-xl p-3 pl-4 focus:ring-2 focus:ring-vitblue appearance-none transition-all cursor-pointer text-gray-700 font-medium"
            >
              <option value="">All Destinations</option>
              {routes.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="relative">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Departure Time</label>
            <select
              value={selectedTime}
              onChange={e => setSelectedTime(e.target.value)}
              className="w-full bg-gray-50 border-none ring-1 ring-gray-200 rounded-xl p-3 pl-4 focus:ring-2 focus:ring-vitblue appearance-none transition-all cursor-pointer text-gray-700 font-medium"
            >
              <option value="">Any Time</option>
              {times.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between mb-4 px-1">
          <p className="text-sm font-semibold text-gray-500">
            Showing {filtered.length} results
          </p>
          {(selectedRoute || selectedTime) && (
            <button
              onClick={() => { setSelectedRoute(""); setSelectedTime("") }}
              className="text-sm text-vitblue font-bold hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Shuttle Cards */}
        <div className="grid gap-4 pb-10">
          {filtered.length === 0 ? (
            <div className="bg-gray-50 rounded-3xl py-16 px-4 text-center border-2 border-dashed border-gray-200">
              <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚌</span>
              </div>
              <h3 className="text-lg font-bold text-gray-800">No buses available</h3>
              <p className="text-gray-500 max-w-xs mx-auto mt-2">
                We couldn't find any shuttles matching your filters for today.
              </p>
            </div>
          ) : (
            filtered.map(shuttle => {
              const bus = busMap[shuttle.busId]
              if (!bus) return null

              return (
                <div
                  key={shuttle.id}
                  className="group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-vitblue/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="hidden sm:flex bg-blue-50 text-vitblue w-12 h-12 rounded-xl items-center justify-center group-hover:bg-vitblue group-hover:text-white transition-colors">
                      <BusIcon />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-xl text-gray-800 group-hover:text-vitblue transition-colors leading-tight">
                        {shuttle.route}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm font-medium">
                        <span className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded text-xs uppercase tracking-tight">
                          Bus: {bus.busNo}
                        </span>
                        <span className="text-gray-400">|</span>
                        <span className="text-gray-600 font-mono">{bus.numberPlate}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center text-gray-500 text-sm">
                          <span className="mr-1.5">🕒</span>
                          {shuttle.time}
                        </div>
                        <div className="flex items-center text-gray-500 text-sm">
                          <span className="mr-1.5">👤</span>
                          {bus.driver?.name || "Assigning..."}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 border-t border-gray-50 pt-4 md:border-none md:pt-0">
                    <div className="md:hidden flex flex-col">
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Fare</span>
                      <span className="font-bold text-gray-900">Complimentary</span>
                    </div>
                    <button
                      onClick={() => navigate(`/student/seat-layout/${shuttle.id}`, {
                        state: {
                          route: shuttle.route,
                          time: shuttle.time
                        }
                      })}
                      className="w-full md:w-auto bg-vitblue text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-blue-100 hover:shadow-blue-200 hover:-translate-y-0.5 active:translate-y-0 transition-all"
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

export default BusSelection