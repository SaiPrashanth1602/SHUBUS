import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit2, Eye, Trash2, Plus, Bus, MapPin, User, Hash } from "lucide-react"; // Assuming lucide-react for icons
import PageWrapper from "../components/layout/PageWrapper";
import { getAllBuses, disableBus, updateBus } from "../services/busServices";

function Buses() {
  const navigate = useNavigate();
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBus, setSelectedBus] = useState(null);
  const [editingBus, setEditingBus] = useState(null);

  useEffect(() => {
    const fetchBuses = async () => {
      try {
        const data = await getAllBuses();
        setBuses(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBuses();
  }, []);

  const handleRemove = async (busId) => {
    if (!window.confirm("Are you sure you want to remove this bus? This action cannot be undone.")) return;
    try {
      await disableBus(busId);
      setBuses(prev => prev.filter(b => b.id !== busId));
    } catch (err) {
      alert("Failed to delete bus");
    }
  };

  const handleSaveEdit = async () => {
    const updated = {
      ...editingBus,
      driver: {
        name: editingBus.driver?.name || "",
        phone: editingBus.driver?.phone || ""
      }
    };

    await updateBus(editingBus.id, updated);
    setBuses(prev => prev.map(b => (b.id === editingBus.id ? { ...b, ...updated } : b)));
    setEditingBus(null);
  };

  return (
    <PageWrapper role="admin">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Bus Master</h1>
          <p className="text-slate-500 mt-1">Manage fleet logistics and driver assignments.</p>
        </div>
        <button
          onClick={() => navigate("/admin/add-bus")}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-200 active:scale-95"
        >
          <Plus size={20} />
          <span>Add New Bus</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-500 font-medium">Loading fleet data...</p>
        </div>
      ) : buses.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
          <p className="text-slate-400 text-lg">No buses found in the database.</p>
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="p-5 text-xs font-semibold uppercase tracking-wider text-slate-500">Bus Info</th>
                  <th className="p-5 text-xs font-semibold uppercase tracking-wider text-slate-500">Route</th>
                  <th className="p-5 text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
                  <th className="p-5 text-xs font-semibold uppercase tracking-wider text-slate-500">Driver</th>
                  <th className="p-5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {buses.map(bus => (
                  <tr key={bus.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                           <Bus size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-none">{bus.busNo}</p>
                          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">{bus.numberPlate}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-sm text-slate-600 font-medium">
                      {bus.morningRoute ? (
                        <span className="flex items-center gap-1">
                          <MapPin size={14} className="text-slate-400" /> {bus.morningRoute}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="p-5">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        {bus.busType}
                      </span>
                    </td>
                    <td className="p-5">
                       <div className="flex items-center gap-2">
                        <div className="h-7 w-7 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500">
                          {bus.driver?.name?.charAt(0) || "?"}
                        </div>
                        <span className="text-sm font-medium text-slate-700">{bus.driver?.name || "Unassigned"}</span>
                       </div>
                    </td>
                    <td className="p-5">
                      <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ActionButton icon={<Eye size={16}/>} color="bg-slate-100 text-slate-600" onClick={() => setSelectedBus(bus)} />
                        <ActionButton icon={<Edit2 size={16}/>} color="bg-blue-50 text-blue-600" onClick={() => setEditingBus(bus)} />
                        <ActionButton icon={<Trash2 size={16}/>} color="bg-red-50 text-red-600" onClick={() => handleRemove(bus.id)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS */}
          <div className="md:hidden space-y-4">
            {buses.map(bus => (
              <div key={bus.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
                      <Bus size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-lg text-slate-900">{bus.busNo}</p>
                      <p className="text-xs font-mono text-slate-500 uppercase">{bus.numberPlate}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2 py-1 bg-slate-100 rounded-md">{bus.busType}</span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin size={14} className="text-slate-400" />
                    <span>{bus.morningRoute || "No Route Assigned"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <User size={14} className="text-slate-400" />
                    <span>{bus.driver?.name || "No Driver Assigned"}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setSelectedBus(bus)} className="flex-1 bg-slate-50 text-slate-600 py-2.5 rounded-xl font-bold text-sm">View</button>
                  <button onClick={() => setEditingBus(bus)} className="flex-1 bg-blue-50 text-blue-600 py-2.5 rounded-xl font-bold text-sm">Edit</button>
                  <button onClick={() => handleRemove(bus.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl"><Trash2 size={18}/></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* MODALS */}
      {selectedBus && (
        <Modal title="Bus Details" onClose={() => setSelectedBus(null)}>
          <div className="bg-slate-50 rounded-2xl p-4 space-y-4">
            <KV icon={<Hash size={16}/>} label="Bus Number" value={selectedBus.busNo} />
            <KV icon={<Hash size={16}/>} label="Number Plate" value={selectedBus.numberPlate} />
            <KV icon={<MapPin size={16}/>} label="Morning Route" value={selectedBus.morningRoute || "-"} />
            <KV icon={<Bus size={16}/>} label="Vehicle Type" value={selectedBus.busType} />
            <KV icon={<User size={16}/>} label="Assigned Driver" value={selectedBus.driver?.name || "Unassigned"} />
          </div>
        </Modal>
      )}

      {editingBus && (
        <Modal title="Quick Edit" onClose={() => setEditingBus(null)}>
          <div className="space-y-4">
            <Input label="Bus Identifier" value={editingBus.busNo}
              onChange={v => setEditingBus({ ...editingBus, busNo: v })} />
            <Input label="License Plate" value={editingBus.numberPlate}
              onChange={v => setEditingBus({ ...editingBus, numberPlate: v })} />
            <Input label="Route Name" value={editingBus.morningRoute || ""}
              onChange={v => setEditingBus({ ...editingBus, morningRoute: v })} />
            
            <button
              onClick={handleSaveEdit}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-blue-100"
            >
              Save Changes
            </button>
          </div>
        </Modal>
      )}
    </PageWrapper>
  );
}

// ---------------- STYLED HELPERS ----------------

function ActionButton({ icon, color, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`p-2 rounded-lg transition-transform active:scale-90 ${color}`}
    >
      {icon}
    </button>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

function KV({ label, value, icon }) {
  return (
    <div className="flex justify-between items-center py-1">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="font-bold text-slate-900">{value}</span>
    </div>
  );
}

function Input({ label, value, onChange }) {
  return (
    <div className="group">
      <label className="block text-xs font-bold text-slate-500 mb-1 ml-1 uppercase">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
      />
    </div>
  );
}

export default Buses;