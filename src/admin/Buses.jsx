import { useEffect, useState } from "react"
import PageWrapper from "../components/layout/PageWrapper"
import { getAllBuses, disableBus, updateBus } from "../services/busServices"
import { useNavigate } from "react-router-dom"

function Buses() {
  const navigate = useNavigate()

  const [buses, setBuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedBus, setSelectedBus] = useState(null)
  const [editingBus, setEditingBus] = useState(null)

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

  const handleSaveEdit = async () => {
    try {
      const updatedBus = {
        busNo: editingBus.busNo,
        numberPlate: editingBus.numberPlate,
        busType: editingBus.busType,
        seatLayoutId: editingBus.seatLayoutId,
        morningRoute: editingBus.morningRoute || "",
        driver: {
          name: editingBus.driver?.name || "",
          phone: editingBus.driver?.phone || ""
        }
      }

      await updateBus(editingBus.id, updatedBus)

      setBuses(prev =>
        prev.map(b =>
          b.id === editingBus.id ? { ...b, ...updatedBus } : b
        )
      )

      setEditingBus(null)
    } catch (err) {
      console.error("Failed to update bus", err)
      alert("Failed to update bus")
    }
  }

  return (
    <PageWrapper role="admin">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-vitblue">
            Bus Master
          </h1>
          <p className="text-gray-500 text-sm">
            Manage your fleet efficiently
          </p>
        </div>

        <button
          onClick={() => navigate("/admin/add-bus")}
          className="bg-vitblue text-white px-6 py-3 rounded-xl font-bold shadow hover:opacity-90"
        >
          + Add Bus
        </button>
      </div>

      {/* LOADING / EMPTY */}
      {loading ? (
        <p className="text-center text-gray-500">Loading buses...</p>
      ) : buses.length === 0 ? (
        <p className="text-center text-gray-500">No buses found.</p>
      ) : (
        <>
          {/* ================= DESKTOP TABLE ================= */}
          <div className="hidden md:block bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="p-4">Bus</th>
                  <th className="p-4">Route</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Driver</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>

              <tbody>
                {buses.map(bus => (
                  <tr
                    key={bus.id}
                    className="border-t hover:bg-gray-50 transition group"
                  >
                    <td className="p-4 font-bold text-vitblue">
                      {bus.busNo}
                    </td>

                    <td className="p-4">
                      {bus.morningRoute || "-"}
                    </td>

                    <td className="p-4">{bus.busType}</td>

                    <td className="p-4">
                      {bus.driver?.name || "Not assigned"}
                    </td>

                    {/* ✅ FIXED ACTIONS */}
                    <td className="p-4">
                      <div className="flex justify-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
                        <button
                          onClick={() => setSelectedBus(bus)}
                          className="px-3 py-1 bg-gray-100 rounded text-sm"
                        >
                          View
                        </button>

                        <button
                          onClick={() => setEditingBus(bus)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleRemove(bus.id)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ================= MOBILE CARDS ================= */}
          <div className="md:hidden space-y-4">
            {buses.map(bus => (
              <div
                key={bus.id}
                className="bg-white rounded-xl shadow p-4"
              >
                <div className="flex justify-between">
                  <div>
                    <p className="font-bold text-lg">{bus.busNo}</p>
                    <p className="text-xs text-gray-500">
                      {bus.numberPlate}
                    </p>
                  </div>

                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {bus.busType}
                  </span>
                </div>

                <div className="mt-3 text-sm space-y-1">
                  <p>Route: {bus.morningRoute || "-"}</p>
                  <p>Driver: {bus.driver?.name || "N/A"}</p>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setSelectedBus(bus)}
                    className="flex-1 py-2 bg-gray-100 rounded"
                  >
                    View
                  </button>

                  <button
                    onClick={() => setEditingBus(bus)}
                    className="flex-1 py-2 bg-blue-100 text-blue-700 rounded"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleRemove(bus.id)}
                    className="flex-1 py-2 bg-red-100 text-red-700 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ================= VIEW MODAL ================= */}
      {selectedBus && (
        <Modal title="Bus Details" onClose={() => setSelectedBus(null)}>
          <KeyValue label="Bus No" value={selectedBus.busNo} />
          <KeyValue label="Plate" value={selectedBus.numberPlate} />
          <KeyValue label="Route" value={selectedBus.morningRoute || "-"} />
          <KeyValue label="Type" value={selectedBus.busType} />
          <KeyValue label="Seats" value={selectedBus.seatLayoutId} />
          <KeyValue label="Driver" value={selectedBus.driver?.name || "-"} />
          <KeyValue label="Phone" value={selectedBus.driver?.phone || "-"} />
        </Modal>
      )}

      {/* ================= EDIT MODAL ================= */}
      {editingBus && (
        <Modal title="Edit Bus" onClose={() => setEditingBus(null)} isForm>
          <Input label="Bus No" value={editingBus.busNo}
            onChange={v => setEditingBus({ ...editingBus, busNo: v })} />

          <Input label="Number Plate" value={editingBus.numberPlate}
            onChange={v => setEditingBus({ ...editingBus, numberPlate: v })} />

          <Select label="Type" value={editingBus.busType}
            onChange={v => setEditingBus({ ...editingBus, busType: v })}
            options={["Non-AC", "AC"]} />

          <Input label="Route" value={editingBus.morningRoute || ""}
            onChange={v => setEditingBus({ ...editingBus, morningRoute: v })} />

          <Input label="Seat Layout" value={editingBus.seatLayoutId}
            onChange={v => setEditingBus({ ...editingBus, seatLayoutId: v })} />

          <Input label="Driver Name" value={editingBus.driver?.name || ""}
            onChange={v =>
              setEditingBus({
                ...editingBus,
                driver: { ...editingBus.driver, name: v }
              })
            } />

          <Input label="Driver Phone" value={editingBus.driver?.phone || ""}
            onChange={v =>
              setEditingBus({
                ...editingBus,
                driver: { ...editingBus.driver, phone: v }
              })
            } />

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setEditingBus(null)}
              className="flex-1 py-2 bg-gray-200 rounded"
            >
              Cancel
            </button>

            <button
              onClick={handleSaveEdit}
              className="flex-1 py-2 bg-vitblue text-white rounded"
            >
              Save
            </button>
          </div>
        </Modal>
      )}
    </PageWrapper>
  )
}

export default Buses

// ---------- HELPERS ----------
function Modal({ title, children, onClose, isForm = false }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md p-6 rounded-t-2xl sm:rounded-xl">
        <h2 className="font-bold mb-4">{title}</h2>
        {children}
        {!isForm && (
          <button
            onClick={onClose}
            className="mt-4 w-full bg-gray-200 py-2 rounded"
          >
            Close
          </button>
        )}
      </div>
    </div>
  )
}

function KeyValue({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

function Input({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full p-2 border rounded mt-1"
      />
    </div>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full p-2 border rounded mt-1"
      >
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}