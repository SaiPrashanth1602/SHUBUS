import { useState } from "react"
import { useNavigate } from "react-router-dom"
import PageWrapper from "../components/layout/PageWrapper"

const ROUTES = [
  "VELACHERY",
  "TAMBARAM",
  "ALANDUR - METRO",
  "SHOLINGANALLUR"
]

const TIMES = ["1:20", "1:45"]

function AdminDashboard() {
  const navigate = useNavigate()

  const [route, setRoute] = useState("")
  const [time, setTime] = useState("")
  const [busType, setBusType] = useState("Non-AC")

  const handleChooseLayout = () => {
    if (!route || !time) {
      alert("Please select route and time")
      return
    }

    navigate("/admin/add-bus", {
      state: { route, time, busType }
    })
  }

  return (
    <PageWrapper role="admin">
      <h1 className="text-2xl font-bold text-vitblue mb-6">
        Admin Dashboard
      </h1>

      <div className="bg-white p-6 rounded-xl shadow max-w-md space-y-4">
        {/* Route */}
        <select
          value={route}
          onChange={e => setRoute(e.target.value)}
          className="w-full p-3 border rounded-lg"
        >
          <option value="">Select Route</option>
          {ROUTES.map(r => (
            <option key={r}>{r}</option>
          ))}
        </select>

        {/* Time */}
        <select
          value={time}
          onChange={e => setTime(e.target.value)}
          className="w-full p-3 border rounded-lg"
        >
          <option value="">Leaving Time</option>
          {TIMES.map(t => (
            <option key={t}>{t}</option>
          ))}
        </select>

        {/* AC / Non-AC */}
        <select
          value={busType}
          onChange={e => setBusType(e.target.value)}
          className="w-full p-3 border rounded-lg"
        >
          <option>Non-AC</option>
          <option>AC</option>
        </select>

        {/* Choose Layout */}
        <button
          onClick={handleChooseLayout}
          className="w-full bg-vitblue text-white py-3 rounded-lg font-semibold"
        >
          Choose Seat Layout
        </button>
      </div>
    </PageWrapper>
  )
}

export default AdminDashboard
