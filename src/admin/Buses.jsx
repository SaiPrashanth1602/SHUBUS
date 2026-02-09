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
      setBuses(prev => prev.map(b => (b.id === editingBus.id ? { ...b, ...updatedBus } : b)))
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
          <h1 className="text-2xl md:text-3xl font-bold text-vitblue">Bus Master</h1>
          <p className="text-gray-500 text-sm">Manage your vehicle fleet and driver assignments</p>
        </div>
        <button
          onClick={() => navigate("/admin/add-bus")}
          className="bg-vitblue text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-800 transition-all text-center"
        >
          + Add Bus
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-10"><p className="text-gray-500 animate-pulse">Loading fleet...</p></div>
      ) : buses.length === 0 ? (
        <div className="text-center p-10 bg-white rounded-xl border-2 border-dashed"><p className="text-gray-500">No buses added yet.</p></div>
      ) : (
        <>
          {/* DESKTOP TABLE */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="p-4">Bus No</th>
                  <th className="p-4">Plate</th>
                  <th className="p-4">Morning Route</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Driver</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {buses.map(bus => (
                  <tr key={bus.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-bold text-vitblue">{bus.busNo}</td>
                    <td className="p-4 text-sm uppercase">{bus.numberPlate}</td>
                    <td className="p-4 text-sm">{bus.morningRoute || "-"}</td>
                    <td className="p-4 text-sm">{bus.busType}</td>
                    <td className="p-4 text-sm">{bus.driver?.name || "Not assigned"}</td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => setSelectedBus(bus)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">View</button>
                        <button onClick={() => setEditingBus(bus)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">Edit</button>
                        <button onClick={() => handleRemove(bus.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS */}
          <div className="md:hidden grid grid-cols-1 gap-4">
            {buses.map(bus => (
              <div key={bus.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex justify-between items-start border-b pb-3 mb-3">
                  <div>
                    <p className="font-bold text-lg text-vitblue">{bus.busNo}</p>
                    <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">{bus.numberPlate}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${bus.busType === 'AC' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {bus.busType}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-y-2 text-sm mb-4">
                  <p className="text-gray-400">Route</p>
                  <p className="text-right font-medium">{bus.morningRoute || "-"}</p>
                  <p className="text-gray-400">Driver</p>
                  <p className="text-right font-medium">{bus.driver?.name || "N/A"}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedBus(bus)} className="flex-1 py-2 text-xs font-bold rounded-lg border border-gray-200">View</button>
                  <button onClick={() => setEditingBus(bus)} className="flex-1 py-2 text-xs font-bold rounded-lg bg-blue-50 text-blue-700">Edit</button>
                  <button onClick={() => handleRemove(bus.id)} className="flex-1 py-2 text-xs font-bold rounded-lg bg-red-50 text-red-700">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* VIEW MODAL */}
      {selectedBus && (
        <Modal title="Vehicle Specification" onClose={() => setSelectedBus(null)}>
          <div className="space-y-4">
            <KeyValue label="Bus Number" value={selectedBus.busNo} />
            <KeyValue label="Number Plate" value={selectedBus.numberPlate} />
            <KeyValue label="Morning Route" value={selectedBus.morningRoute || "-"} />
            <KeyValue label="Bus Type" value={selectedBus.busType} />
            <KeyValue label="Seat Layout" value={selectedBus.seatLayoutId} />
            <div className="pt-2 border-t mt-2">
               <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Driver Contact</p>
               <KeyValue label="Name" value={selectedBus.driver?.name || "Not assigned"} />
               <KeyValue label="Phone" value={selectedBus.driver?.phone || "-"} />
            </div>
          </div>
        </Modal>
      )}

      {/* EDIT MODAL */}
      {editingBus && (
        <Modal title="Update Vehicle Information" onClose={() => setEditingBus(null)} isForm>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
            <Input label="Bus Number" value={editingBus.busNo} onChange={v => setEditingBus({ ...editingBus, busNo: v })} />
            <Input label="Number Plate" value={editingBus.numberPlate} onChange={v => setEditingBus({ ...editingBus, numberPlate: v })} />
            <div className="grid grid-cols-2 gap-3">
                <Select label="Bus Type" value={editingBus.busType} onChange={v => setEditingBus({ ...editingBus, busType: v })} options={["Non-AC", "AC"]} />
                <Input label="Layout ID" value={editingBus.seatLayoutId} onChange={v => setEditingBus({ ...editingBus, seatLayoutId: v })} />
            </div>
            <Input label="Morning Route" value={editingBus.morningRoute || ""} onChange={v => setEditingBus({ ...editingBus, morningRoute: v })} />
            <div className="grid grid-cols-2 gap-3">
                <Input label="Driver Name" value={editingBus.driver?.name || ""} onChange={v => setEditingBus({ ...editingBus, driver: { ...editingBus.driver, name: v } })} />
                <Input label="Driver Phone" value={editingBus.driver?.phone || ""} onChange={v => setEditingBus({ ...editingBus, driver: { ...editingBus.driver, phone: v } })} />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setEditingBus(null)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-sm">Cancel</button>
            <button onClick={handleSaveEdit} className="flex-1 py-3 bg-vitblue text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-100">Save</button>
          </div>
        </Modal>
      )}
    </PageWrapper>
  )
}

export default Buses

// ---------------- SMALL UI HELPERS ----------------
function Modal({ title, children, onClose, isForm = false }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white p-6 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md animate-in slide-in-from-bottom sm:zoom-in duration-300">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div>{children}</div>
        {!isForm && (
          <button onClick={onClose} className="mt-6 w-full bg-gray-100 py-3 rounded-xl font-bold text-gray-700">Close</button>
        )}
      </div>
    </div>
  )
}

function KeyValue({ label, value }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-gray-400 text-xs font-medium">{label}</span>
      <span className="font-semibold text-gray-800 text-sm">{value}</span>
    </div>
  )
}

function Input({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-vitblue outline-none text-sm transition-all" />
    </div>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-vitblue outline-none text-sm appearance-none">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}