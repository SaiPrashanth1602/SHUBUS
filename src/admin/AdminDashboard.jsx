import { useEffect, useState } from "react"
import PageWrapper from "../components/layout/PageWrapper"
import {
  cancelShuttle,
  updateShuttle
} from "../services/shuttleServices"
import { getAllBuses } from "../services/busServices"
import { useNavigate } from "react-router-dom"
import { subscribeShuttlesByDate } from "../services/shuttleServices"
import { doc, deleteDoc } from "firebase/firestore"; // Add deleteDoc to your imports at the top
import { db } from "../config/firebase";
import { Bus, MapPin, User, Phone, Hash, Layers } from "lucide-react"
import Modal from "../components/ui/Modal"

function AdminDashboard() {
  const [selectedBus, setSelectedBus] = useState(null)
  const navigate = useNavigate()
  const [routeFilter, setRouteFilter] = useState("ALL")
  const [timeFilter, setTimeFilter] = useState("ALL")

  const [shuttles, setShuttles] = useState([])
  const [busMap, setBusMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [editingShuttle, setEditingShuttle] = useState(null)

  const availableRoutes = Array.from(new Set(shuttles.map(s => s.route)))
  const availableTimes = Array.from(new Set(shuttles.map(s => s.time)))

  const filteredShuttles = shuttles.filter(s => {
    const routeOk = routeFilter === "ALL" || s.route === routeFilter
    const timeOk = timeFilter === "ALL" || s.time === timeFilter
    return routeOk && timeOk
  })
const KV = ({ label, value, icon }) => (
  <div className="flex justify-between items-center text-sm">
    <div className="flex items-center gap-2 text-gray-500">{icon}{label}</div>
    <span className="font-semibold">{value}</span>
  </div>
)
  const today = new Date().toISOString().split("T")[0]
  const displayDate = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  })

  useEffect(() => {
  let unsubscribe = () => {}

  const fetchBuses = async () => {
    const busData = await getAllBuses()
    const map = {}
    busData.forEach(bus => {
      map[bus.id] = bus
    })
    setBusMap(map)
  }

  fetchBuses()

  unsubscribe = subscribeShuttlesByDate(today, data => {
    setShuttles(data)
    setLoading(false)
  })

  return () => unsubscribe()
}, [today])


  // Overview Metrics
  const totalShuttles = shuttles.length
  const acCount = shuttles.filter(s => busMap[s.busId]?.busType === "AC").length
  const nonAcCount = totalShuttles - acCount
  const uniqueRoutes = new Set(shuttles.map(s => s.route)).size

  const handleCancelShuttle = async (shuttleId) => {
    const confirm = window.confirm("Cancel this shuttle?")
    if (!confirm) return
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
      console.error("Failed to update shuttle", err)
      alert("Failed to update shuttle")
    }
  }

  return (
    <PageWrapper role="admin">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-vitblue">Admin Dashboard</h1>
        <button
          onClick={() => navigate("/admin/add-shuttle")}
          className="bg-vitblue text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-800 transition-all text-center"
        >
          + Add Shuttle
        </button>
      </div>

      {/* ================= OVERVIEW METRICS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Today</p>
          <p className="text-base font-semibold text-gray-800 mt-1">{displayDate}</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Running Shuttles</p>
          <p className="text-3xl font-bold text-vitblue mt-1">{loading ? "-" : totalShuttles}</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Bus Types</p>
          <p className="text-lg font-semibold text-gray-800 mt-1">
            <span className="text-blue-600">{acCount} AC</span> • {nonAcCount} Non-AC
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Active Routes</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{uniqueRoutes}</p>
        </div>
      </div>

      {/* ================= FILTERS ================= */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase">Filters:</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            <select
              value={routeFilter}
              onChange={e => setRouteFilter(e.target.value)}
              className="p-3 bg-gray-50 border rounded-lg outline-none focus:ring-2 focus:ring-vitblue"
            >
              <option value="ALL">All Routes</option>
              {availableRoutes.map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            <select
              value={timeFilter}
              onChange={e => setTimeFilter(e.target.value)}
              className="p-3 bg-gray-50 border rounded-lg outline-none focus:ring-2 focus:ring-vitblue"
            >
              <option value="ALL">All Times</option>
              {availableTimes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ================= TABLE ================= */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50">
          <h2 className="font-bold text-gray-700">Today's Schedule</h2>
        </div>
        
        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading shuttles...</div>
        ) : filteredShuttles.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No matching shuttles found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-widest">
                <tr>
                  <th className="p-4">Bus</th>
                  <th className="p-4">Plate</th>
                  <th className="p-4">Route</th>
                  <th className="p-4">Time</th>
                  <th className="p-4 hidden lg:table-cell">Type</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredShuttles.map(shuttle => {
                  const bus = busMap[shuttle.busId]
                  if (!bus) return null
                  return (
                    <tr key={shuttle.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="p-4 font-bold text-vitblue">{bus.busNo}</td>
                      <td className="p-4 text-sm text-gray-600">{bus.numberPlate}</td>
                      <td className="p-4 font-medium">{shuttle.route}</td>
                      <td className="p-4">
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
                          {shuttle.time}
                        </span>
                      </td>
                      <td className="p-4 hidden lg:table-cell text-gray-500 text-sm">{bus.busType}</td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2">
  <button
    onClick={() => setSelectedBus(bus)}
    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
    title="View Bus"
  >
    View
  </button>

  <button
    onClick={() => setEditingShuttle(shuttle)}
    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
    title="Edit"
  >
    Edit
  </button>

  <button
    onClick={() => handleCancelShuttle(shuttle.id)}
    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
    title="Cancel"
  >
    Cancel
  </button>
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
{/* ================= VIEW MODAL ================= */}
{selectedBus && (
  <Modal title="Bus Details" onClose={() => setSelectedBus(null)}>
    <div className="space-y-6">
      
      {/* VEHICLE INFO SECTION */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">
          Vehicle Specifications
        </p>
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
          <KV icon={<Hash size={16} className="text-blue-500" />} label="Bus Number" value={selectedBus.busNo} />
          <KV icon={<Hash size={16} className="text-slate-400" />} label="Number Plate" value={selectedBus.numberPlate} />

          <div className="flex justify-between items-center py-1">
            <div className="flex items-center gap-2 text-slate-500">
              <Bus size={16} className="text-slate-400" />
              <span className="text-sm font-medium">Bus Type</span>
            </div>
            <span className="px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold shadow-sm">
              {selectedBus.busType}
            </span>
          </div>

          <KV icon={<Layers size={16} className="text-slate-400" />} label="Seat Layout" value={selectedBus.seatLayoutId} />
        </div>
      </div>

      {/* ASSIGNMENT INFO SECTION */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">
          Route & Personnel
        </p>
        <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100/50 space-y-3">
          <KV icon={<MapPin size={16} className="text-red-400" />} label="Morning Route" value={selectedBus.morningRoute || "Not Assigned"} />
          <KV icon={<User size={16} className="text-blue-600" />} label="Driver Name" value={selectedBus.driver?.name || "Unassigned"} />
          <KV icon={<Phone size={16} className="text-green-600" />} label="Driver Phone" value={selectedBus.driver?.phone || "No Contact"} />
        </div>
      </div>

      {/* FOOTER ACTION */}
      <button 
        onClick={() => setSelectedBus(null)}
        className="w-full py-3 text-slate-500 font-semibold text-sm hover:bg-slate-50 rounded-xl transition-colors"
      >
        Close Preview
      </button>
    </div>
  </Modal>
)}

      {/* ================= EDIT MODAL ================= */}
      {editingShuttle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-1">Edit Shuttle</h2>
            <p className="text-sm text-gray-500 mb-6">Updating schedule for {busMap[editingShuttle.busId]?.busNo}</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Route</label>
                <select
                  className="w-full p-3 border rounded-xl mt-1 bg-gray-50 focus:ring-2 focus:ring-vitblue outline-none"
                  value={editingShuttle.route}
                  onChange={e => setEditingShuttle({ ...editingShuttle, route: e.target.value })}
                >
                  <option value="VELACHERY">VELACHERY</option>
                  <option value="TAMBARAM">TAMBARAM</option>
                  <option value="ALANDUR - METRO">ALANDUR - METRO</option>
                  <option value="SHOLINGANALLUR">SHOLINGANALLUR</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Time</label>
                <select
                  className="w-full p-3 border rounded-xl mt-1 bg-gray-50 focus:ring-2 focus:ring-vitblue outline-none"
                  value={editingShuttle.time}
                  onChange={e => setEditingShuttle({ ...editingShuttle, time: e.target.value })}
                >
                  <option value="1:20">1:20</option>
                  <option value="1:45">1:45</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setEditingShuttle(null)}
                  className="flex-1 py-3 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 bg-vitblue text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}


export default AdminDashboard