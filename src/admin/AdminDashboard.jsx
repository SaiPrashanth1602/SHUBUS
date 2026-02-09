import { useEffect, useState } from "react"
import PageWrapper from "../components/layout/PageWrapper"
import { getShuttlesByDate } from "../services/shuttleServices"
import { getAllBuses } from "../services/busServices"
import { useNavigate } from "react-router-dom"

function AdminDashboard() {
  const navigate = useNavigate()
  const [shuttles, setShuttles] = useState([])
  const [busMap, setBusMap] = useState({})
  const [loading, setLoading] = useState(true)

  // TEMP – later make dynamic
  const today = "2026-02-07"

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [shuttleData, busData] = await Promise.all([
          getShuttlesByDate(today),
          getAllBuses()
        ])

        // Build busId → bus object map
        const map = {}
        busData.forEach(bus => {
          map[bus.id] = bus
        })

        setBusMap(map)
        setShuttles(shuttleData)
      } catch (err) {
        console.error("Failed to load dashboard data", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <PageWrapper role="admin">
      <h1 className="text-2xl font-bold text-vitblue mb-6">
        Admin Dashboard
      </h1>

      {/* OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl shadow">
          <p className="text-gray-500 text-sm">Date</p>
          <p className="text-xl font-semibold">{today}</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow">
          <p className="text-gray-500 text-sm">Shuttles Today</p>
          <p className="text-3xl font-bold text-vitblue">
            {loading ? "-" : shuttles.length}
          </p>
        </div>
      </div>

      {/* SHUTTLE LIST */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">
          Today’s Running Shuttles
        </h2>

        <button
          onClick={() => navigate("/admin/add-shuttle")}
          className="bg-vitblue text-white px-4 py-2 rounded-lg font-semibold"
        >
          + Add Shuttle
        </button>
      </div>


      {loading ? (
        <p className="text-gray-500">Loading shuttles...</p>
      ) : shuttles.length === 0 ? (
        <p className="text-gray-500">No shuttles scheduled for today.</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-vitlight">
              <tr>
                <th className="p-3">Bus No</th>
                <th className="p-3">Number Plate</th>
                <th className="p-3">Route</th>
                <th className="p-3">Time</th>
                <th className="p-3">Type</th>
              </tr>
            </thead>

            <tbody>
              {shuttles.map(shuttle => {
                const bus = busMap[shuttle.busId]
                if (!bus) return null

                return (
                  <tr key={shuttle.id} className="border-t">
                    <td className="p-3 font-semibold">{bus.busNo}</td>
                    <td className="p-3">{bus.numberPlate}</td>
                    <td className="p-3">{shuttle.route}</td>
                    <td className="p-3">{shuttle.time}</td>
                    <td className="p-3">{bus.busType}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageWrapper>
  )
}

export default AdminDashboard
