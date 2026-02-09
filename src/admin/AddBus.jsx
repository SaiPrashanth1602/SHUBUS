import { useState } from "react"
import { useNavigate } from "react-router-dom"
import PageWrapper from "../components/layout/PageWrapper"
import { addBus } from "../services/busServices"

function AddBus() {
  const navigate = useNavigate()

  const [busNo, setBusNo] = useState("")
  const [numberPlate, setNumberPlate] = useState("")
  const [busType, setBusType] = useState("Non-AC")
  const [seatLayoutId, setSeatLayoutId] = useState("STD_40")
  const [driverName, setDriverName] = useState("")
  const [driverPhone, setDriverPhone] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!busNo || !numberPlate) {
      alert("Bus No and Number Plate are required")
      return
    }

    setLoading(true)

    try {
      await addBus({
        busNo,
        numberPlate: numberPlate.replace(/[^A-Z0-9]/gi, "").toUpperCase(),
        busType,
        seatLayoutId,
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
      <h1 className="text-2xl font-bold text-vitblue mb-6">
        Add Bus (Hardware)
      </h1>

      <div className="bg-white p-6 rounded-xl shadow max-w-md space-y-4">
        <input
          type="text"
          placeholder="Bus No (e.g. Bus 12)"
          value={busNo}
          onChange={e => setBusNo(e.target.value)}
          className="w-full p-3 border rounded-lg"
        />

        <input
          type="text"
          placeholder="Number Plate (e.g. TN 09 AB 2345)"
          value={numberPlate}
          onChange={e => setNumberPlate(e.target.value)}
          className="w-full p-3 border rounded-lg"
        />

        <select
          value={busType}
          onChange={e => setBusType(e.target.value)}
          className="w-full p-3 border rounded-lg"
        >
          <option value="Non-AC">Non-AC</option>
          <option value="AC">AC</option>
        </select>

        <input
          type="text"
          placeholder="Seat Layout ID (e.g. STD_40)"
          value={seatLayoutId}
          onChange={e => setSeatLayoutId(e.target.value)}
          className="w-full p-3 border rounded-lg"
        />

        <input
          type="text"
          placeholder="Driver Name"
          value={driverName}
          onChange={e => setDriverName(e.target.value)}
          className="w-full p-3 border rounded-lg"
        />

        <input
          type="text"
          placeholder="Driver Phone"
          value={driverPhone}
          onChange={e => setDriverPhone(e.target.value)}
          className="w-full p-3 border rounded-lg"
        />

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-vitblue text-white py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add Bus"}
          </button>

          <button
            onClick={() => navigate("/admin/buses")}
            className="flex-1 bg-gray-200 py-3 rounded-lg font-semibold"
          >
            Cancel
          </button>
        </div>
      </div>
    </PageWrapper>
  )
}

export default AddBus
