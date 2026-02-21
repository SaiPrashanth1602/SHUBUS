import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Edit2, Eye, Trash2, Plus, Bus, MapPin, User, Hash, Phone, Users, ArrowUp} from "lucide-react"
import PageWrapper from "../components/layout/PageWrapper"
import { getAllBuses, disableBus, updateBus } from "../services/busServices"

function Buses() {
  const navigate = useNavigate()
  const [buses, setBuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedBus, setSelectedBus] = useState(null)
  const [editingBus, setEditingBus] = useState(null)
  const [search, setSearch] = useState("")
  const [showScrollTop, setShowScrollTop] = useState(false) // ✨ State for the button

  // ✨ Handle scroll visibility for the Back to Top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

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
      totalSeats: editingBus.totalSeats, 
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
    if (!search) return true;
    const query = search.toLowerCase().trim();

    let matchesType = false;
    if (query === "ac") {
      matchesType = bus.busType.toLowerCase() === "ac";
    } else if (query === "non-ac" || query === "non ac") {
      matchesType = bus.busType.toLowerCase() === "non-ac";
    } else {
      matchesType = bus.busType.toLowerCase().includes(query);
    }

    const matchesBusNo = bus.busNo.toLowerCase().includes(query);
    const matchesRoute = bus.morningRoute ? bus.morningRoute.toLowerCase().includes(query) : false;

    return matchesBusNo || matchesType || matchesRoute;
  })

  return (
    <PageWrapper role="admin">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-vitblue mb-1 flex items-center gap-2 flex-wrap">Bus Master</h1>
          <p className="text-slate-500 text-sm">Bus Management</p>
        </div>
        <button
          onClick={() => navigate("/admin/add-bus")}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg"
        >
          <Plus size={18} /> Add Bus
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-20 animate-pulse font-medium">Loading buses…</p>
        ) : (
        <>
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search by Bus No, Route, or Type..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border p-4 rounded-2xl w-full md:w-96 focus:ring-2 focus:ring-blue-600 outline-none transition shadow-sm bg-white"
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-gray-50 text-gray-400 font-bold text-[10px] uppercase tracking-widest border-b border-gray-100">
                  <tr>
                    <th className="p-4 pl-6">Bus</th>
                    <th className="p-4">Morning Route</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Driver</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredBuses.map(bus => (
                    <tr key={bus.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="p-4 pl-6 font-bold text-gray-900">{bus.busNo}</td>
                      <td className="p-4 text-gray-600 text-sm">{bus.morningRoute || "—"}</td>
                      <td className="p-4">
                         <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${bus.busType === 'AC' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-800'}`}>
                            {bus.busType}
                         </span>
                      </td>
                      <td className="p-4 text-gray-600 text-sm">{bus.driver?.name || "Unassigned"}</td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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

              {filteredBuses.length === 0 && !loading && (
                <div className="p-20 text-center flex flex-col items-center justify-center">
                  <Bus size={48} className="text-gray-200 mb-4" />
                  <p className="text-gray-500 font-bold text-lg leading-tight">No such bus found</p>
                  <p className="text-gray-400 text-sm mt-2 max-w-[250px]">Try searching for a different Bus No, Route, or Type</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* VIEW MODAL */}
      {selectedBus && (
        <Modal title="Bus Details" onClose={() => setSelectedBus(null)}>
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Vehicle Specifications</p>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                <KV icon={<Hash size={16} className="text-blue-500" />} label="Bus Number" value={selectedBus.busNo} />
                <KV icon={<Hash size={16} className="text-slate-400" />} label="Number Plate" value={selectedBus.numberPlate} />
                <div className="flex justify-between items-center py-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Bus size={16} className="text-slate-400" />
                    <span className="text-sm font-medium">Bus Type</span>
                  </div>
                  <span className="px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold shadow-sm">{selectedBus.busType}</span>
                </div>
                <KV icon={<Users size={16} className="text-slate-400" />} label="Capacity" value={`${selectedBus.totalSeats || "50"} Seats`} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Route & Personnel</p>
              <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100/50 space-y-3">
                <KV icon={<MapPin size={16} className="text-red-400" />} label="Morning Route" value={selectedBus.morningRoute || "Not Assigned"} />
                <KV icon={<User size={16} className="text-blue-600" />} label="Driver Name" value={selectedBus.driver?.name || "Unassigned"} />
                <KV icon={<Phone size={16} className="text-green-600" />} label="Driver Phone" value={selectedBus.driver?.phone || "No Contact"} />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* EDIT MODAL */}
      {editingBus && (
        <Modal title="Edit Bus (Safe Fields Only)" onClose={() => setEditingBus(null)}>
          <ReadOnly label="Bus Number" value={editingBus.busNo} />
          <ReadOnly label="Number Plate" value={editingBus.numberPlate} />
          <Field label="Morning Route" value={editingBus.morningRoute || ""} onChange={v => setEditingBus({ ...editingBus, morningRoute: v })} />
          <Field label="Capacity" value={editingBus.totalSeats || ""} onChange={v => setEditingBus({ ...editingBus, totalSeats: v })} />
          <div className="mt-2">
            <label className="text-xs font-bold uppercase text-gray-400">Bus Type</label>
            <select className="w-full p-3 border rounded-xl mt-1" value={editingBus.busType} onChange={e => setEditingBus({ ...editingBus, busType: e.target.value })}>
              <option value="Non-AC">Non-AC</option>
              <option value="AC">AC</option>
            </select>
          </div>
          <Field label="Driver Name" value={editingBus.driver?.name || ""} onChange={v => setEditingBus({ ...editingBus, driver: { ...editingBus.driver, name: v } })} />
          <Field label="Driver Phone" value={editingBus.driver?.phone || ""} onChange={v => setEditingBus({ ...editingBus, driver: { ...editingBus.driver, phone: v } })} />
          <button onClick={handleSaveEdit} className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition">Save Changes</button>
        </Modal>
      )}

      {/* ✨ Floating Back to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 bg-vitblue text-white p-4 rounded-2xl shadow-2xl hover:bg-blue-800 transition-all animate-in fade-in zoom-in slide-in-from-bottom-4 duration-300 z-[60]"
          title="Back to Top"
        >
          <ArrowUp size={24} />
        </button>
      )}
    </PageWrapper>
  )
}

/* Helpers same as before... */
const IconBtn = ({ children, onClick, danger }) => (
  <button onClick={onClick} className={`p-2 rounded-lg transition ${danger ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{children}</button>
)

const Modal = ({ title, children, onClose }) => (
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
    <input value={value} onChange={e => onChange(e.target.value)} className="w-full p-3 border rounded-xl mt-1 focus:ring-2 focus:ring-blue-600 outline-none transition" />
  </div>
)

export default Buses