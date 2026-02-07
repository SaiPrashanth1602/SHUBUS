import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import PageWrapper from "../components/layout/PageWrapper"

function AddBus() {
  const navigate = useNavigate()
  const { state } = useLocation()

  // 🔒 Safety guard
  if (!state) {
    return (
      <PageWrapper role="admin">
        <p className="text-center text-gray-500">
          No bus data found. Please start from Admin Dashboard.
        </p>
      </PageWrapper>
    )
  }

  const { route, time, busType } = state
  const [busNo, setBusNo] = useState("")

  const handleAddBus = () => {
    if (!busNo) {
      alert("Please enter bus number")
      return
    }

    alert("Bus added (UI-only)")
    navigate("/admin/view-buses")
  }

  return (
    <PageWrapper role="admin">
      <h1 className="text-2xl font-bold text-vitblue mb-6">
        Finalize Bus
      </h1>

      {/* Context (READ-ONLY) */}
      <div className="bg-vitlight p-4 rounded-xl mb-4 text-sm">
        <p><b>Route:</b> {route}</p>
        <p><b>Time:</b> {time}</p>
        <p><b>Type:</b> {busType}</p>
      </div>

      {/* Input */}
      <div className="bg-white p-6 rounded-xl shadow max-w-md space-y-4">
        <input
          type="text"
          placeholder="Bus Number (e.g. TN 09 AB 1234)"
          value={busNo}
          onChange={e => setBusNo(e.target.value)}
          className="w-full p-3 border rounded-lg"
        />

        <button
          onClick={handleAddBus}
          className="w-full bg-vitblue text-white py-3 rounded-lg font-semibold"
        >
          Add Bus
        </button>
      </div>
    </PageWrapper>
  )
}

export default AddBus
