import { useEffect, useState } from "react"
import PageWrapper from "../components/layout/PageWrapper"
import { getAllBuses } from "../services/busServices"
import { addShuttle, subscribeShuttlesByDate } from "../services/shuttleServices"
import { Bus, MapPin, User, Phone, Hash, Layers, CalendarClock } from "lucide-react" 
import Modal from "../components/ui/Modal"

const ROUTES = ["VELACHERY", "TAMBARAM", "ALANDUR - METRO", "SHOLINGANALLUR"]
const TIMES = ["1:20", "1:45"]

// ✨ NEW: Smart date helper — after 3 PM (or 12 PM for testing), flip to tomorrow!
const getActiveDate = () => {
  const now = new Date()
  if (now.getHours() >= 15) { // Change to 15 when done testing!
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split("T")[0]
  }
  return now.toISOString().split("T")[0]
}

const KV = ({ label, value, icon }) => (
  <div className="flex justify-between items-center text-sm">
    <div className="flex items-center gap-2 text-gray-500">{icon}{label}</div>
    <span className="font-semibold text-gray-800">{value}</span>
  </div>
)

function AddShuttle() {
  const [buses, setBuses] = useState([])
  const [busMap, setBusMap] = useState({})
  const [shuttles, setShuttles] = useState([])
  const [selectedBus, setSelectedBus] = useState(null)
  const [viewBus, setViewBus] = useState(null)
  const [route, setRoute] = useState("")
  const [time, setTime] = useState("")
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  
  const activeDate = getActiveDate()
  const isSchedulingForTomorrow = new Date().getHours() >= 15 // Change to 15 when done testing!

  // ✨ FIX: Top greeting always shows the actual CURRENT date normally
  const currentDateDisplay = new Date().toLocaleDateString('en-IN', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  })

  useEffect(() => {
    const fetchBuses = async () => {
      const busData = await getAllBuses()
      const map = {}
      busData.forEach(b => (map[b.id] = b))
      setBusMap(map)
      setBuses(busData)
      setLoading(false)
    }

    fetchBuses()

    const unsubscribe = subscribeShuttlesByDate(activeDate, (data) => {
      setShuttles(data)
    })

    return () => unsubscribe()
  }, [activeDate])

  const usedBusIds = shuttles.map(s => s.busId)
  const availableBuses = buses.filter(b => !usedBusIds.includes(b.id))
  
  const filteredBuses = availableBuses.filter(bus => {
    const query = search.toLowerCase().trim()
    const matchesBusNo = bus.busNo.toLowerCase().includes(query)
    const matchesPlate = bus.numberPlate.toLowerCase().includes(query)

    // Special handling for AC / NON-AC
    let matchesType = false
    if (query === "ac") {
      matchesType = bus.busType.toLowerCase() === "ac"
    } else if (query === "non-ac" || query === "non ac") {
      matchesType = bus.busType.toLowerCase() === "non-ac"
    } else {
      matchesType = bus.busType.toLowerCase().includes(query)
    }

    return matchesBusNo || matchesPlate || matchesType
  })

  const handleAddShuttle = async () => {
    if (!selectedBus || !route || !time) {
      alert("Please fill all fields");
      return;
    }

    if (loading) return;

    try {
      setLoading(true);

      await addShuttle({
        busId: selectedBus.id,
        gpsId: selectedBus.gpsId,
        route,
        time,
        date: activeDate, 
        busNo: selectedBus.busNo 
      });

      setSelectedBus(null);
      setRoute("");
      setTime("");
      alert(`Shuttle Added for ${isSchedulingForTomorrow ? 'Tomorrow' : 'Today'}!`);

    } catch (error) {
      console.error("Error adding shuttle:", error);
      alert("Failed to add shuttle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper role="admin">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
        <div>
          {/* ✨ FIX: Added the clean badge next to the title */}
          <h1 className="text-2xl md:text-3xl font-bold text-vitblue mb-1 flex items-center gap-2 flex-wrap">
            Manage Shuttles
            {isSchedulingForTomorrow && (
               <span className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 shadow-sm mt-1 md:mt-0">
                 <CalendarClock size={12} />
                 Planning Ahead
               </span>
            )}
          </h1>
          {/* ✨ FIX: Normal current date displayed here */}
          <p className="text-gray-500 font-medium text-sm">
            {currentDateDisplay}
          </p>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by Bus No, Plate or Type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-96 p-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-vitblue outline-none transition"
        />
      </div>

      {/* AVAILABLE BUSES SECTION */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          Available Buses
          <span className="bg-blue-100 text-vitblue text-xs px-2 py-1 rounded-full font-bold">
            {filteredBuses.length}
          </span>
        </h2>

        {loading ? (
          <div className="animate-pulse text-gray-400">Loading fleet...</div>
        ) : filteredBuses.length === 0 ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 p-8 rounded-xl text-center text-gray-500 font-semibold">
            No buses available for assignment {isSchedulingForTomorrow ? "tomorrow" : "today"}.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredBuses.map(bus => (
              <div
                key={bus.id}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div className={`absolute top-0 right-0 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-bl-lg ${
                    bus.busType === "AC" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                  }`}>
                    {bus.busType}
                </div>

                <div className="mt-1">
                  <p className="font-bold text-vitblue">{bus.busNo}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">
                    {bus.numberPlate}
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewBus(bus)}
                      className="px-3 py-2 text-sm font-semibold border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-100 transition"
                    >
                      View
                    </button>
                    <button
                      onClick={() => setSelectedBus(bus)}
                      className="bg-vitblue text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors shadow-sm"
                    >
                      Assign
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ASSIGNMENT MODAL/FORM */}
      {selectedBus && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-1">Assign Shuttle</h3>
                <p className="text-sm text-gray-500">
                  Assigning {selectedBus.busNo} for <strong>{isSchedulingForTomorrow ? "Tomorrow" : "Today"}</strong>.
                </p>
              </div>
              <button onClick={() => setSelectedBus(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Route</label>
                <select
                  className="w-full p-3 border rounded-xl mt-1 bg-gray-50 focus:ring-2 focus:ring-vitblue outline-none font-semibold text-gray-700"
                  value={route}
                  onChange={e => setRoute(e.target.value)}
                >
                  <option value="">Select Route</option>
                  {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Departure Time</label>
                <select
                  className="w-full p-3 border rounded-xl mt-1 bg-gray-50 focus:ring-2 focus:ring-vitblue outline-none font-semibold text-gray-700"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                >
                  <option value="">Select Time</option>
                  {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setSelectedBus(null)}
                  className="flex-1 py-3 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddShuttle}
                  className="flex-1 bg-vitblue text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-800 transition"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW MODAL ================= */}
      {viewBus && (
        <Modal title="Bus Details" onClose={() => setViewBus(null)}>
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">
                Vehicle Specifications
              </p>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                <KV icon={<Hash size={16} className="text-blue-500" />} label="Bus Number" value={viewBus.busNo} />
                <KV icon={<Hash size={16} className="text-slate-400" />} label="Number Plate" value={viewBus.numberPlate} />

                <div className="flex justify-between items-center py-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Bus size={16} className="text-slate-400" />
                    <span className="text-sm font-medium">Bus Type</span>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest shadow-sm ${
                    viewBus.busType === "AC" ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-orange-50 text-orange-700 border border-orange-200"
                  }`}>
                    {viewBus.busType}
                  </span>
                </div>

                <KV icon={<Layers size={16} className="text-slate-400" />} label="Seat Layout" value={viewBus.seatLayoutId} />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">
                Route & Personnel
              </p>
              <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100/50 space-y-3">
                <KV icon={<MapPin size={16} className="text-red-400" />} label="Morning Route" value={viewBus.morningRoute || "Not Assigned"} />
                <KV icon={<User size={16} className="text-blue-600" />} label="Driver Name" value={viewBus.driver?.name || "Unassigned"} />
                <KV icon={<Phone size={16} className="text-green-600" />} label="Driver Phone" value={viewBus.driver?.phone || "No Contact"} />
              </div>
            </div>

            <button
              onClick={() => setViewBus(null)}
              className="w-full py-3 text-slate-500 font-semibold text-sm hover:bg-slate-100 rounded-xl transition-colors"
            >
              Close Preview
            </button>
          </div>
        </Modal>
      )}

      {/* RUNNING SHUTTLES TABLE */}
      <h2 className="text-lg font-semibold mb-4 mt-8 flex items-center gap-2">
        {isSchedulingForTomorrow ? "Scheduled for Tomorrow" : "Running Today"}
        <span className="bg-green-100 text-green-700 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full">
          Live
        </span>
      </h2>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-widest font-bold">
                <th className="p-4 whitespace-nowrap">Bus</th>
                <th className="p-4 whitespace-nowrap">Route</th>
                <th className="p-4 whitespace-nowrap">Time</th>
                <th className="p-4 hidden sm:table-cell whitespace-nowrap">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shuttles.map(s => {
                const bus = busMap[s.busId]
                return (
                  <tr key={s.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="p-4 font-semibold text-vitblue whitespace-nowrap">{bus?.busNo || "N/A"}</td>
                    <td className="p-4 text-gray-700 whitespace-nowrap">{s.route}</td>
                    <td className="p-4 whitespace-nowrap">
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
                        {s.time}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 hidden sm:table-cell text-sm whitespace-nowrap">
                      {bus && (
                         <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            bus.busType === "AC" ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"
                          }`}>
                            {bus.busType}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {shuttles.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-400 font-medium">
                    No shuttles active {isSchedulingForTomorrow ? "for tomorrow" : "yet"}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageWrapper>
  )
}

export default AddShuttle
