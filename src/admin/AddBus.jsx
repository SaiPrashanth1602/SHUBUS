import { useState } from "react"
import { useNavigate } from "react-router-dom"
import PageWrapper from "../components/layout/PageWrapper"
import { addBus } from "../services/busServices"

function AddBus() {
  const navigate = useNavigate()
  const [morningRoute, setMorningRoute] = useState("")
  const [busNo, setBusNo] = useState("")
  const [numberPlate, setNumberPlate] = useState("")
  const [busType, setBusType] = useState("Non-AC")
  const [totalSeats, setTotalSeats] = useState("50") // ✅ NEW: Default to 50
  const [driverName, setDriverName] = useState("")
  const [driverPhone, setDriverPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [gpsId, setGpsId] = useState("")

  const handleSubmit = async () => {
    if (!busNo || !numberPlate || !gpsId || !totalSeats) {
      alert("Bus No, Plate, GPS ID, and Capacity are required")
      return
    }
    setLoading(true)
    try {
      await addBus({
        busNo,
        gpsId: gpsId.trim(),
        numberPlate: numberPlate.replace(/[^A-Z0-9]/gi, "").toUpperCase(),
        busType,
        totalSeats: parseInt(totalSeats), // ✅ NEW: Save to DB
        morningRoute,
        driver: {
          name: driverName || "Not assigned",
          phone: driverPhone || ""
        }
      })
      navigate("/admin/buses")
    } catch (err) {
      console.error("Failed to add bus", err)
      alert("Failed to add bus")
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageWrapper role="admin">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-vitblue mb-6">
          Add Bus (Hardware)
        </h1>

        <div className="bg-white p-5 md:p-8 rounded-xl shadow-md space-y-5">
          {/* Grid Layout for Desktop: 2 columns for smaller fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">Bus Number</label>
              <input
                type="text"
                placeholder="e.g. Bus 12"
                value={busNo}
                onChange={e => setBusNo(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-vitblue outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">Number Plate</label>
              <input
                type="text"
                placeholder="TN 09 AB 2345"
                value={numberPlate}
                onChange={e => setNumberPlate(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-vitblue outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">Bus Type</label>
              <select
                value={busType}
                onChange={e => setBusType(e.target.value)}
                className="w-full p-3 border rounded-lg bg-white"
              >
                <option value="Non-AC">Non-AC</option>
                <option value="AC">AC</option>
              </select>
            </div>

            {/* ✅ NEW: Total Seats Input */}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">Total Seats (Capacity)</label>
              <input
                type="number"
                placeholder="50"
                value={totalSeats}
                onChange={e => setTotalSeats(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-vitblue outline-none"
              />
            </div>
          </div>

          <hr className="my-2 border-gray-100" />

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-600">Morning Route</label>
            <input
              type="text"
              placeholder="e.g. Velachery"
              value={morningRoute}
              onChange={e => setMorningRoute(e.target.value)}
              className="w-full p-3 border rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">Driver Name</label>
              <input
                type="text"
                placeholder="Name"
                value={driverName}
                onChange={e => setDriverName(e.target.value)}
                className="w-full p-3 border rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">Driver Phone</label>
              <input
                type="tel"
                placeholder="Phone Number"
                value={driverPhone}
                onChange={e => setDriverPhone(e.target.value)}
                className="w-full p-3 border rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">GPS Device ID</label>
              <input
                type="text"
                placeholder="e.g. bus1"
                value={gpsId}
                onChange={e => setGpsId(e.target.value)}
                className="w-full p-3 border rounded-lg"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse md:flex-row gap-3 pt-4">
            <button
              onClick={() => navigate("/admin/buses")}
              className="w-full md:w-1/3 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full md:w-2/3 bg-vitblue text-white py-3 rounded-lg font-semibold disabled:opacity-50 hover:bg-blue-800 transition-colors shadow-lg shadow-blue-200"
            >
              {loading ? "Adding..." : "Add Bus"}
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}

export default AddBus