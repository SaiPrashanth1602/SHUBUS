import { useEffect, useState } from "react"
import PageWrapper from "../components/layout/PageWrapper"
import { getAllBuses } from "../services/busServices"
import { addShuttle, getShuttlesByDate } from "../services/shuttleServices"

const ROUTES = [
  "VELACHERY",
  "TAMBARAM",
  "ALANDUR - METRO",
  "SHOLINGANALLUR"
]

const TIMES = ["1:20", "1:45"]

function AddShuttle() {
  const [buses, setBuses] = useState([])
  const [shuttles, setShuttles] = useState([])
  const [selectedBus, setSelectedBus] = useState(null)
  const [route, setRoute] = useState("")
  const [time, setTime] = useState("")
  const [date, setDate] = useState("2026-02-07")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [busData, shuttleData] = await Promise.all([
          getAllBuses(),
          getShuttlesByDate(date)
        ])

        setBuses(busData.filter(b => b.active !== false))
        setShuttles(shuttleData)
      } catch (err) {
        console.error("Failed to load data", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [date])

  // 🔒 CORE LOGIC: buses already running today
  const usedBusIds = shuttles.map(shuttle => shuttle.busId)

  const handleAddShuttle = async () => {
    if (!selectedBus || !route || !time || !date) {
      alert("Please fill all fields")
      return
    }

    // 🛑 SAFETY CHECK
    if (usedBusIds.includes(selectedBus.id)) {
      alert("This bus is already running today")
      return
    }

    try {
      await addShuttle({
        busId: selectedBus.id,
        route,
        time,
        date,
        active: true
      })

      alert("Shuttle added successfully")

      // update UI immediately
      setShuttles(prev => [
        ...prev,
        { busId: selectedBus.id }
      ])

      setSelectedBus(null)
      setRoute("")
      setTime("")
    } catch (err) {
      console.error("Failed to add shuttle", err)
      alert("Failed to add shuttle")
    }
  }

  return (
    <PageWrapper role="admin">
      <h1 className="text-2xl font-bold text-vitblue mb-6">
        Add Shuttle
      </h1>

      {/* AVAILABLE BUSES */}
      {loading ? (
        <p className="text-gray-500">Loading buses...</p>
      ) : buses.filter(bus => !usedBusIds.includes(bus.id)).length === 0 ? (
        <p className="text-gray-500">No available buses to add.</p>
      ) : (
        <div className="grid gap-4 mb-6">
          {buses
            .filter(bus => !usedBusIds.includes(bus.id))
            .map(bus => (
              <div
                key={bus.id}
                className="bg-white p-4 rounded-xl shadow flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold">{bus.busNo}</p>
                  <p className="text-sm text-gray-600">
                    {bus.numberPlate} • {bus.busType}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedBus(bus)}
                  className="bg-vitblue text-white px-4 py-2 rounded-lg font-semibold"
                >
                  Add Shuttle
                </button>
              </div>
            ))}
        </div>
      )}

      {/* SHUTTLE FORM */}
      {selectedBus && (
        <div className="bg-white p-6 rounded-xl shadow max-w-md">
          <h2 className="font-bold mb-4">
            Add Shuttle for {selectedBus.busNo}
          </h2>

          <select
            className="w-full p-3 border rounded-lg mb-3"
            value={route}
            onChange={e => setRoute(e.target.value)}
          >
            <option value="">Select Route</option>
            {ROUTES.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <select
            className="w-full p-3 border rounded-lg mb-3"
            value={time}
            onChange={e => setTime(e.target.value)}
          >
            <option value="">Select Time</option>
            {TIMES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full p-3 border rounded-lg mb-4"
          />

          <div className="flex gap-3">
            <button
              onClick={handleAddShuttle}
              className="flex-1 bg-vitblue text-white py-3 rounded-lg font-semibold"
            >
              Confirm Shuttle
            </button>

            <button
              onClick={() => setSelectedBus(null)}
              className="flex-1 bg-gray-200 py-3 rounded-lg font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}

export default AddShuttle
