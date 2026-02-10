import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Edit2, Eye, Trash2, Plus, Bus, MapPin, User, Hash, Layers, Phone} from "lucide-react"
import PageWrapper from "../components/layout/PageWrapper"
import { getAllBuses, disableBus, updateBus } from "../services/busServices"

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
      } finally {
        setLoading(false)
      }
    }
    fetchBuses()
  }, [])

  const handleRemove = async (busId) => {
    if (!window.confirm("Archive this bus? It can be restored later.")) return
    await disableBus(busId)
    setBuses(prev => prev.filter(b => b.id !== busId))
  }

  const handleSaveEdit = async () => {
    const updates = {
      morningRoute: editingBus.morningRoute || "",
      busType: editingBus.busType,
      seatLayoutId: editingBus.seatLayoutId,
      driver: {
        name: editingBus.driver?.name || "",
        phone: editingBus.driver?.phone || ""
      }
    }

    await updateBus(editingBus.id, updates)

    setBuses(prev =>
      prev.map(b => (b.id === editingBus.id ? { ...b, ...updates } : b))
    )
    setEditingBus(null)
  }

  return (
    <PageWrapper role="admin">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold">Bus Master</h1>
          <p className="text-slate-500">Hardware & driver management</p>
        </div>
        <button
          onClick={() => navigate("/admin/add-bus")}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg"
        >
          <Plus size={18} /> Add Bus
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-20">Loading buses…</p>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs uppercase">
              <tr>
                <th className="p-4">Bus</th>
                <th className="p-4">Morning Route</th>
                <th className="p-4">Type</th>
                <th className="p-4">Driver</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {buses.map(bus => (
                <tr key={bus.id} className="border-t hover:bg-blue-50/30">
                  <td className="p-4 font-bold">{bus.busNo}</td>
                  <td className="p-4">{bus.morningRoute || "—"}</td>
                  <td className="p-4">{bus.busType}</td>
                  <td className="p-4">{bus.driver?.name || "Unassigned"}</td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <IconBtn onClick={() => setSelectedBus(bus)}><Eye size={16} /></IconBtn>
                      <IconBtn onClick={() => setEditingBus(bus)}><Edit2 size={16} /></IconBtn>
                      <IconBtn danger onClick={() => handleRemove(bus.id)}><Trash2 size={16} /></IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
      {editingBus && (
        <Modal title="Edit Bus (Safe Fields Only)" onClose={() => setEditingBus(null)}>
          <ReadOnly label="Bus Number" value={editingBus.busNo} />
          <ReadOnly label="Number Plate" value={editingBus.numberPlate} />

          <Field label="Morning Route" value={editingBus.morningRoute || ""}
            onChange={v => setEditingBus({ ...editingBus, morningRoute: v })} />

          <Field label="Seat Layout" value={editingBus.seatLayoutId}
            onChange={v => setEditingBus({ ...editingBus, seatLayoutId: v })} />

          <select
            className="w-full p-3 border rounded-xl"
            value={editingBus.busType}
            onChange={e => setEditingBus({ ...editingBus, busType: e.target.value })}
          >
            <option value="Non-AC">Non-AC</option>
            <option value="AC">AC</option>
          </select>

          <Field label="Driver Name" value={editingBus.driver?.name || ""}
            onChange={v => setEditingBus({ ...editingBus, driver: { ...editingBus.driver, name: v } })} />

          <Field label="Driver Phone" value={editingBus.driver?.phone || ""}
            onChange={v => setEditingBus({ ...editingBus, driver: { ...editingBus.driver, phone: v } })} />

          <button
            onClick={handleSaveEdit}
            className="mt-4 w-full bg-blue-600 text-white py-3 rounded-xl font-bold"
          >
            Save Changes
          </button>
        </Modal>
      )}
    </PageWrapper>
  )
}

/* ---------- Helpers ---------- */

const IconBtn = ({ children, onClick, danger }) => (
  <button
    onClick={onClick}
    className={`p-2 rounded-lg ${danger ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600"}`}
  >
    {children}
  </button>
)

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl p-6 w-full max-w-md">
      <div className="flex justify-between mb-4">
        <h2 className="font-bold text-lg">{title}</h2>
        <button onClick={onClose}>✕</button>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  </div>
)

const KV = ({ label, value, icon }) => (
  <div className="flex justify-between items-center text-sm">
    <div className="flex items-center gap-2 text-gray-500">{icon}{label}</div>
    <span className="font-semibold">{value}</span>
  </div>
)

const ReadOnly = ({ label, value }) => (
  <div className="text-sm text-gray-500">
    <strong>{label}:</strong> {value}
  </div>
)

const Field = ({ label, value, onChange }) => (
  <div>
    <label className="text-xs font-bold uppercase text-gray-400">{label}</label>
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full p-3 border rounded-xl"
    />
  </div>
)

export default Buses
