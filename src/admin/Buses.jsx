import { useEffect, useState } from "react"
import PageWrapper from "../components/layout/PageWrapper"
import { getAllBuses, disableBus } from "../services/busServices"
import { useNavigate } from "react-router-dom"

function Buses() {
  const navigate = useNavigate()
  const [buses, setBuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedBus, setSelectedBus] = useState(null)

  useEffect(() => {
    const fetchBuses = async () => {
      try {
        const data = await getAllBuses()
        setBuses(data)
      } catch (err) {
        console.error("Failed to load buses", err)
      } finally {
        setLoading(false)
      }
    }

    fetchBuses()
  }, [])

  const handleRemove = async (busId) => {
    const confirm = window.confirm("Remove this bus from system?")
    if (!confirm) return

    await disableBus(busId)
    setBuses(prev => prev.filter(b => b.id !== busId))
  }

  const handleView = (bus) => {
    setSelectedBus(bus)
  }

  const handleEdit = () => {
    alert("Edit bus coming next")
  }

  return (
    <PageWrapper role="admin">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-vitblue">
          Bus Master
        </h1>

        <button
          onClick={() => navigate("/admin/add-bus")}
          className="bg-vitblue text-white px-4 py-2 rounded-lg font-semibold"
        >
          + Add Bus
        </button>
      </div>


      {loading ? (
        <p className="text-gray-500">Loading buses...</p>
      ) : buses.length === 0 ? (
        <p className="text-gray-500">No buses added yet.</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-vitlight">
              <tr>
                <th className="p-3">Bus No</th>
                <th className="p-3">Number Plate</th>
                <th className="p-3">Type</th>
                <th className="p-3">Seat Layout</th>
                <th className="p-3">Driver</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {buses.map(bus => (
                <tr key={bus.id} className="border-t">
                  <td className="p-3 font-semibold">{bus.busNo}</td>
                  <td className="p-3">{bus.numberPlate}</td>
                  <td className="p-3">{bus.busType}</td>
                  <td className="p-3">{bus.seatLayoutId}</td>
                  <td className="p-3">
                    {bus.driver?.name || "Not assigned"}
                  </td>

                  <td className="p-3 flex gap-2">
                    <button
                      onClick={() => handleView(bus)}
                      className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300"
                    >
                      View
                    </button>

                    <button
                      onClick={handleEdit}
                      className="px-3 py-1 text-sm rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleRemove(bus.id)}
                      className="px-3 py-1 text-sm rounded bg-red-100 text-red-700 hover:bg-red-200"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {selectedBus && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow max-w-md w-full">
            <h2 className="text-lg font-bold mb-4">Bus Details</h2>

            <div className="space-y-2 text-sm">
              <p><b>Bus No:</b> {selectedBus.busNo}</p>
              <p><b>Number Plate:</b> {selectedBus.numberPlate}</p>
              <p><b>Type:</b> {selectedBus.busType}</p>
              <p><b>Seat Layout:</b> {selectedBus.seatLayoutId}</p>
              <p><b>Driver:</b> {selectedBus.driver?.name || "N/A"}</p>
              <p><b>Driver Phone:</b> {selectedBus.driver?.phone || "N/A"}</p>
            </div>

            <button
              onClick={() => setSelectedBus(null)}
              className="mt-5 w-full bg-vitblue text-white py-2 rounded-lg font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}

export default Buses