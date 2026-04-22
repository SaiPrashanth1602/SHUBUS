import { useEffect, useState } from "react"
import PageWrapper from "../components/layout/PageWrapper"
import {
  cancelShuttle,
  updateShuttle
} from "../services/shuttleServices"
import { getAllBuses } from "../services/busServices"
import { useNavigate } from "react-router-dom"
import { subscribeShuttlesByDate } from "../services/shuttleServices"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "../config/firebase"
import { Bus, MapPin, User, Phone, Hash, Users, CalendarClock, Eye, Edit, Trash2, ArrowUp } from "lucide-react"
import Modal from "../components/ui/Modal"

// Smart date helper — after 3 PM, flip to tomorrow
const getActiveDate = () => {
  const now = new Date()
  if (now.getHours() >= 15) { 
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split("T")[0]
  }
  return now.toISOString().split("T")[0]
}

function AdminDashboard() {
  const [selectedBus, setSelectedBus] = useState(null)
  const navigate = useNavigate()
  const [routeFilter, setRouteFilter] = useState("ALL")
  const [timeFilter, setTimeFilter] = useState("ALL")

  const [shuttles, setShuttles] = useState([])
  const [busMap, setBusMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [editingShuttle, setEditingShuttle] = useState(null)
  const [showScrollTop, setShowScrollTop] = useState(false) // ✨ State for button

  // Smart active date for queries
  const activeDate = getActiveDate()
  const isSchedulingForTomorrow = new Date().getHours() >= 15 

  const availableRoutes = Array.from(new Set(shuttles.map(s => s.route)))
  const availableTimes = Array.from(new Set(shuttles.map(s => s.time)))

  // ✨ Handle Scroll for Back to Top
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" })

  const filteredShuttles = shuttles.filter(s => {
    const routeOk = routeFilter === "ALL" || s.route === routeFilter
    const timeOk = timeFilter === "ALL" || s.time === timeFilter
    return routeOk && timeOk
  })

  const KV = ({ label, value, icon }) => (
    <div className="flex justify-between items-center text-sm">
      <div className="flex items-center gap-2 text-gray-500">{icon}{label}</div>
      <span className="font-semibold text-gray-800">{value}</span>
    </div>
  )

  const currentDateDisplay = new Date().toLocaleDateString('en-IN', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  })

  useEffect(() => {
    let unsubscribe = () => {}

    const fetchBuses = async () => {
      const busData = await getAllBuses()
      const map = {}
      busData.forEach(bus => { map[bus.id] = bus })
      setBusMap(map)
    }

    fetchBuses()

    unsubscribe = subscribeShuttlesByDate(activeDate, data => {
      setShuttles(data)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [activeDate])

  // Overview Metrics
  const totalShuttles = shuttles.length
  const acCount = shuttles.filter(s => busMap[s.busId]?.busType === "AC").length
  const nonAcCount = totalShuttles - acCount
  const uniqueRoutes = new Set(shuttles.map(s => s.route)).size

  const handleCancelShuttle = async (shuttleId) => {
    if (!window.confirm("Cancel this shuttle?")) return
    try {
      await cancelShuttle(shuttleId)
    } catch (err) {
      console.error("Failed to cancel shuttle", err)
      alert("Failed to cancel shuttle")
    }
  }

  const handleSaveEdit = async () => {
    try {
      await updateShuttle(editingShuttle.id, {
        route: editingShuttle.route,
        time: editingShuttle.time
      })
      setEditingShuttle(null)
    } catch (err) {
      alert("Failed to update shuttle")
    }
  }

  // Determine Greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good Morning"
    if (hour < 18) return "Good Afternoon"
    return "Good Evening"
  }

  return (
    <PageWrapper role="admin">

      {/* ================= HEADER & GREETING ================= */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {getGreeting()}, Admin 👋
          </h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">
            {currentDateDisplay}
          </p>
        </div>

        <button
          onClick={() => navigate("/admin/add-shuttle")}
          className="bg-vitblue text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-800 transition-all text-center whitespace-nowrap"
        >
          + Add Shuttle
        </button>
      </div>

      {/* ================= OVERVIEW METRICS ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">Total Buses</p>
          <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-1">{Object.keys(busMap).length}</p>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">
            {isSchedulingForTomorrow ? "Tomorrow's Shuttles" : "Running Shuttles"}
          </p>
          <p className="text-2xl md:text-3xl font-bold text-vitblue mt-1">{loading ? "-" : totalShuttles}</p>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">Bus Types</p>
          <div className="text-xs md:text-sm font-bold text-gray-800 mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-blue-700 bg-blue-100 px-2 py-0.5 rounded">{acCount} AC</span>
            <span className="text-orange-700 bg-orange-100 px-2 py-0.5 rounded">{nonAcCount} NON-AC</span>
          </div>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">Active Routes</p>
          <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-1">{uniqueRoutes}</p>
        </div>
      </div>

      {/* ================= FILTERS ================= */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase">Filters:</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            <select value={routeFilter} onChange={e => setRouteFilter(e.target.value)} className="w-full p-3 bg-gray-50 border rounded-lg outline-none font-semibold text-gray-700">
              <option value="ALL">All Routes</option>
              {availableRoutes.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={timeFilter} onChange={e => setTimeFilter(e.target.value)} className="w-full p-3 bg-gray-50 border rounded-lg outline-none font-semibold text-gray-700">
              <option value="ALL">All Times</option>
              {availableTimes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ================= TABLE (UPDATED UI) ================= */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[300px]">
        <div className="p-4 border-b border-gray-50 flex flex-wrap items-center gap-3">
          <h2 className="font-bold text-gray-700 flex items-center gap-2">
            Schedule
            {isSchedulingForTomorrow && (
              <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-black flex items-center gap-1">
                <CalendarClock size={12} /> Planning for Tomorrow
              </span>
            )}
          </h2>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400 animate-pulse">Loading shuttles...</div>
        ) : filteredShuttles.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <Bus size={48} className="text-gray-200 mb-4" />
            <p className="text-gray-500 font-bold text-lg leading-tight">No matching shuttles found</p>
            <p className="text-gray-400 text-sm mt-2 max-w-[250px] mx-auto">Try adjusting your filters or add a new shuttle assignment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold tracking-widest border-b border-gray-100">
                <tr>
                  <th className="p-4">Bus</th>
                  <th className="p-4">Morning Route</th>
                  <th className="p-4">Plate</th>
                  <th className="p-4">Route (Today)</th>
                  <th className="p-4">Time</th>
                  <th className="p-4">Driver</th>
                  <th className="p-4">Type</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredShuttles.map(shuttle => {
                  const bus = busMap[shuttle.busId]
                  if (!bus) return null
                  return (
                    <tr key={shuttle.id} className="hover:bg-blue-50/50 transition-colors group">
                      <td className="p-4 font-bold text-vitblue">{bus.busNo}</td>
                      <td className="p-4 text-gray-600 text-sm">{bus.morningRoute || "—"}</td>
                      <td className="p-4 text-gray-400 font-mono text-xs uppercase">{bus.numberPlate}</td>
                      <td className="p-4 font-medium text-gray-800">{shuttle.route}</td>
                      <td className="p-4">
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">{shuttle.time}</span>
                      </td>
                      <td className="p-4 text-gray-600 text-sm">{bus.driver?.name || "—"}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold ${
                          bus.busType === "AC" ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"
                        }`}>{bus.busType}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setSelectedBus(bus)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><Eye size={18} /></button>
                          <button onClick={() => setEditingShuttle(shuttle)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={18} /></button>
                          <button onClick={() => handleCancelShuttle(shuttle.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* VIEW MODAL */}
      {selectedBus && (
        <Modal title="Bus Details" onClose={() => setSelectedBus(null)}>
          <div className="space-y-6">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
              <KV icon={<Hash size={16} className="text-blue-500" />} label="Bus Number" value={selectedBus.busNo} />
              <KV icon={<Hash size={16} className="text-slate-400" />} label="Number Plate" value={selectedBus.numberPlate} />
              <div className="flex justify-between items-center py-1">
                <div className="flex items-center gap-2 text-slate-500"><Bus size={16} /><span className="text-sm">Bus Type</span></div>
                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${selectedBus.busType === "AC" ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"}`}>{selectedBus.busType}</span>
              </div>
              <KV icon={<Users size={16} className="text-slate-400" />} label="Capacity" value={`${selectedBus.totalSeats || 50} Seats`} />
            </div>
            <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100/50 space-y-3">
              <KV icon={<MapPin size={16} className="text-red-400" />} label="Morning Route" value={selectedBus.morningRoute || "Not Assigned"} />
              <KV icon={<User size={16} className="text-blue-600" />} label="Driver" value={selectedBus.driver?.name || "Unassigned"} />
              <KV icon={<Phone size={16} className="text-green-600" />} label="Phone" value={selectedBus.driver?.phone || "No Contact"} />
            </div>
          </div>
        </Modal>
      )}

      {/* EDIT MODAL */}
      {editingShuttle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-6 text-slate-800">Edit Shuttle Assignment</h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Route</label>
                <select className="w-full p-3 border rounded-xl bg-slate-50 outline-none font-semibold text-slate-700" value={editingShuttle.route} onChange={e => setEditingShuttle({ ...editingShuttle, route: e.target.value })}>
                  <option value="VELACHERY">VELACHERY</option>
                  <option value="TAMBARAM">TAMBARAM</option>
                  <option value="ALANDUR - METRO">ALANDUR - METRO</option>
                  <option value="SHOLINGANALLUR">SHOLINGANALLUR</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Time Slot</label>
                <select className="w-full p-3 border rounded-xl bg-slate-50 outline-none font-semibold text-slate-700" value={editingShuttle.time} onChange={e => setEditingShuttle({ ...editingShuttle, time: e.target.value })}>
                  <option value="1:20">1:20</option>
                  <option value="1:45">1:45</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setEditingShuttle(null)} className="flex-1 py-3 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition">Discard</button>
                <button onClick={handleSaveEdit} className="flex-1 bg-vitblue text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-800">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✨ Floating Back to Top Button */}
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

export default AdminDashboard