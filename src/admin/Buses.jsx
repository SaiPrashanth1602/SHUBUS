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
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("All")

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

  const filteredBuses = buses.filter(bus => {
    const matchesSearch =
      bus.busNo.toLowerCase().includes(search.toLowerCase())

    const matchesType =
      typeFilter === "All" || bus.busType === typeFilter

    return matchesSearch && matchesType
  })

  return (
    <PageWrapper role="admin">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold">Bus Master</h1>
          <p className="text-slate-500">Driver management</p>
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
        <>
          {/* SEARCH + FILTER BAR */}
          <div className="flex flex-col md:flex-row gap-3 mb-4">

            {/* SEARCH */}
            <input
              type="text"
              placeholder="Search Bus ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border p-3 rounded-xl w-full md:w-64"
            />

            {/* FILTER */}
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="border p-3 rounded-xl w-full md:w-40"
            >
              <option value="All">All Types</option>
              <option value="AC">AC</option>
              <option value="Non-AC">Non-AC</option>
            </select>

          </div>

          {/* TABLE */}
          <div className="bg-white rounded-2xl border">
            <div className="overflow-x-auto touch-pan-x">

              <table className="min-w-[800px] w-full text-left">
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
                  {filteredBuses.map(bus => (
                    <tr key={bus.id} className="border-t hover:bg-blue-50/30">
                      <td className="p-4 font-bold">{bus.busNo}</td>
                      <td className="p-4">{bus.morningRoute || "—"}</td>
                      <td className="p-4">{bus.busType}</td>
                      <td className="p-4">{bus.driver?.name || "Unassigned"}</td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          <IconBtn onClick={() => setSelectedBus(bus)}>
                            <Eye size={16} />
                          </IconBtn>
                          <IconBtn onClick={() => setEditingBus(bus)}>
                            <Edit2 size={16} />
                          </IconBtn>
                          <IconBtn danger onClick={() => handleRemove(bus.id)}>
                            <Trash2 size={16} />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

            </div>
          </div>
        </>
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

          <div className="mt-2">
            <label className="text-xs font-bold uppercase text-gray-400">Bus Type</label>
            <select
              className="w-full p-3 border rounded-xl mt-1"
              value={editingBus.busType}
              onChange={e => setEditingBus({ ...editingBus, busType: e.target.value })}
            >
              <option value="Non-AC">Non-AC</option>
              <option value="AC">AC</option>
            </select>
          </div>

          <Field label="Driver Name" value={editingBus.driver?.name || ""}
            onChange={v => setEditingBus({ ...editingBus, driver: { ...editingBus.driver, name: v } })} />

          <Field label="Driver Phone" value={editingBus.driver?.phone || ""}
            onChange={v => setEditingBus({ ...editingBus, driver: { ...editingBus.driver, phone: v } })} />

          <button
            onClick={handleSaveEdit}
            className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition"
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
    className={`p-2 rounded-lg transition ${danger ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
  >
    {children}
  </button>
)

const Modal = ({ title, children, onClose }) => (
  // ✨ FIX: Added backdrop-blur-sm to the wrapper here!
  <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-extrabold text-xl text-slate-800">{title}</h2>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition">✕</button>
      </div>
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">{children}</div>
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
  <div className="text-sm text-gray-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
    <span className="block text-xs font-bold uppercase text-gray-400 mb-1">{label}</span>
    <span className="font-semibold text-slate-700">{value}</span>
  </div>
)

const Field = ({ label, value, onChange }) => (
  <div className="mt-2">
    <label className="text-xs font-bold uppercase text-gray-400">{label}</label>
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full p-3 border rounded-xl mt-1 focus:ring-2 focus:ring-blue-600 outline-none transition"
    />
  </div>
)

export default Buses
