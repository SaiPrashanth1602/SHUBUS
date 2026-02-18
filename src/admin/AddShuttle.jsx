import { useEffect, useState } from "react"
import PageWrapper from "../components/layout/PageWrapper"
import { getAllBuses } from "../services/busServices"
import { addShuttle, subscribeShuttlesByDate } from "../services/shuttleServices"
import { Bus, MapPin, User, Phone, Hash } from "lucide-react"
import Modal from "../components/ui/Modal"


const ROUTES = ["VELACHERY", "TAMBARAM", "ALANDUR - METRO", "SHOLINGANALLUR"]
const TIMES = ["1:20", "1:45"]

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
  



  const today = new Date().toISOString().split("T")[0]

useEffect(() => {
  const fetchBuses = async () => {
    const busData = await getAllBuses()
    const map = {}
    busData.forEach(b => (map[b.id] = b))
    setBusMap(map)
    setBuses(busData)
    setLoading(false)   // 🔥 ADD THIS
  }

  fetchBuses()

  const unsubscribe = subscribeShuttlesByDate(today, (data) => {
    setShuttles(data)
  })

  return () => unsubscribe()
}, [today])

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



// Inside AddShuttle.js

const handleAddShuttle = async () => {
  if (!selectedBus || !route || !time) {
    alert("Please fill all fields");
    return;
  }

  if (loading) return;

  try {
    setLoading(true);

    // Pass the gpsId along with the other data
    await addShuttle({
      busId: selectedBus.id,
      gpsId: selectedBus.gpsId, // <--- Add this line
      route,
      time,
      date: today,
      busNo: selectedBus.busNo // Useful for showing on the claim page too!
    });

    setSelectedBus(null);
    setRoute("");
    setTime("");
    alert("Shuttle Added!");

  } catch (error) {
    console.error("Error adding shuttle:", error);
    alert("Failed to add shuttle");
  } finally {
    setLoading(false);
  }
};

  return (
    <PageWrapper role="admin">
      <h1 className="text-2xl md:text-3xl font-bold text-vitblue mb-4">
        Manage Shuttles
      </h1>

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
          <span className="bg-blue-100 text-vitblue text-xs px-2 py-1 rounded-full">
            {filteredBuses.length}
          </span>
        </h2>

        {loading ? (
          <div className="animate-pulse text-gray-400">Loading fleet...</div>
        ) : filteredBuses.length === 0 ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 p-8 rounded-xl text-center text-gray-500">
            No buses available for assignment today.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredBuses.map(bus => (
              <div
                key={bus.id}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition-shadow"
              >
                <div>
                  <p className="font-bold text-vitblue">{bus.busNo}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">
                    {bus.busType} • {bus.numberPlate}
                  </p>
                </div>
                <div className="flex gap-2">
                  

                  <div className="flex gap-2">
                    {/* VIEW BUTTON */}
                    <button
                      onClick={() => setViewBus(bus)}
                      className="px-3 py-2 text-sm font-semibold border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                    >
                      View
                    </button>

                    {/* ASSIGN BUTTON */}
                    <button
                      onClick={() => setSelectedBus(bus)}
                      className="bg-vitblue text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-800 mb-1">Assign Shuttle</h3>
            <p className="text-sm text-gray-500 mb-6">Assigning {selectedBus.busNo} to a route.</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Route</label>
                <select
                  className="w-full p-3 border rounded-xl mt-1 bg-gray-50 focus:ring-2 focus:ring-vitblue outline-none"
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
                  className="w-full p-3 border rounded-xl mt-1 bg-gray-50 focus:ring-2 focus:ring-vitblue outline-none"
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
                  className="flex-1 bg-vitblue text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200"
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

            {/* VEHICLE INFO */}
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
                  <span className="px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold shadow-sm">
                    {viewBus.busType}
                  </span>
                </div>

                <KV icon={<Layers size={16} className="text-slate-400" />} label="Seat Layout" value={viewBus.seatLayoutId} />
              </div>
            </div>

            {/* ROUTE & PERSONNEL */}
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
              className="w-full py-3 text-slate-500 font-semibold text-sm hover:bg-slate-50 rounded-xl transition-colors"
            >
              Close Preview
            </button>

          </div>
        </Modal>
      )}


      {/* RUNNING SHUTTLES TABLE */}
      <h2 className="text-lg font-semibold mb-4">Running Today</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-widest font-bold">
                <th className="p-4">Bus</th>
                <th className="p-4">Route</th>
                <th className="p-4">Time</th>
                <th className="p-4 hidden sm:table-cell">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shuttles.map(s => {
                const bus = busMap[s.busId]
                return (
                  <tr key={s.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="p-4 font-semibold text-vitblue">{bus?.busNo || "N/A"}</td>
                    <td className="p-4 text-gray-700">{s.route}</td>
                    <td className="p-4">
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm font-medium">
                        {s.time}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 hidden sm:table-cell text-sm">{bus?.busType}</td>
                  </tr>
                )
              })}
              {shuttles.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-400 italic">No shuttles active yet.</td>
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