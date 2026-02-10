import { useEffect, useState } from "react"
import PageWrapper from "../components/layout/PageWrapper"
import { getAllBuses } from "../services/busServices"
import { addShuttle, getShuttlesByDate } from "../services/shuttleServices"

const ROUTES = ["VELACHERY", "TAMBARAM", "ALANDUR - METRO", "SHOLINGANALLUR"]
const TIMES = ["1:20", "1:45"]

function AddShuttle() {
  const [buses, setBuses] = useState([])
  const [busMap, setBusMap] = useState({})
  const [shuttles, setShuttles] = useState([])
  const [selectedBus, setSelectedBus] = useState(null)
  const [route, setRoute] = useState("")
  const [time, setTime] = useState("")
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split("T")[0]

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [busData, shuttleData] = await Promise.all([
          getAllBuses(),
          getShuttlesByDate(today)
        ])
        const activeBuses = busData.filter(b => b.active !== false)
        const map = {}
        activeBuses.forEach(b => (map[b.id] = b))

        setBusMap(map)
        setBuses(activeBuses)
        setShuttles(shuttleData)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [today])

  const usedBusIds = shuttles.map(s => s.busId)
  const availableBuses = buses.filter(b => !usedBusIds.includes(b.id))

const handleAddShuttle = async () => {
      if (!selectedBus || !route || !time) {
        alert("Please fill all fields");
        return;
      }

      if (loading) return; 

      try {
        setLoading(true);

        const newShuttle = {
          busId: selectedBus.id,
          route,
          time,
          date: today,
          active: true
        };

        const docRef = await addShuttle(newShuttle);

        // ✅ IMPROVEMENT: Update local state immediately so the 
        // bus disappears from "Available" without a second network hit
        setShuttles(prev => [...prev, { id: docRef.id, ...newShuttle }]);
        
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
      <h1 className="text-2xl md:text-3xl font-bold text-vitblue mb-6">Manage Shuttles</h1>

      {/* AVAILABLE BUSES SECTION */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          Available Buses 
          <span className="bg-blue-100 text-vitblue text-xs px-2 py-1 rounded-full">
            {availableBuses.length}
          </span>
        </h2>

        {loading ? (
          <div className="animate-pulse text-gray-400">Loading fleet...</div>
        ) : availableBuses.length === 0 ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 p-8 rounded-xl text-center text-gray-500">
            No buses available for assignment today.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableBuses.map(bus => (
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
                <button
                  onClick={() => setSelectedBus(bus)}
                  className="bg-vitblue text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors"
                >
                  Assign
                </button>
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