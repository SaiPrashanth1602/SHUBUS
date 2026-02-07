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

const BUSES = [
  { id: 1, route: "VELACHERY", time: "1:20", busNo: "TN 09 AB 2345" },
  { id: 2, route: "VELACHERY", time: "1:45", busNo: "TN 10 CD 7812" },
  { id: 3, route: "TAMBARAM", time: "1:20", busNo: "TN 22 EF 4567" },
  { id: 4, route: "ALANDUR - METRO", time: "1:45", busNo: "TN 07 GH 9981" },
  { id: 5, route: "SHOLINGANALLUR", time: "1:20", busNo: "TN 14 JK 1123" },
  { id: 6, route: "SHOLINGANALLUR", time: "1:45", busNo: "TN 18 LM 6742" }
]

function StudentDashboard() {
  const [selectedRoute, setSelectedRoute] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const navigate = useNavigate()

  const filteredBuses = BUSES.filter(bus => {
    return (
      (selectedRoute ? bus.route === selectedRoute : true) &&
      (selectedTime ? bus.time === selectedTime : true)
    )
  })

  return (
    <PageWrapper role="student">
      <h1 className="text-2xl font-bold text-vitblue mb-6">
        Book a Shuttle
      </h1>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow mb-6 flex gap-4">
        <select
          value={selectedRoute}
          onChange={e => setSelectedRoute(e.target.value)}
          className="p-2 border rounded-lg w-1/2"
        >
          <option value="">Select Route</option>
          {ROUTES.map(route => (
            <option key={route} value={route}>
              {route}
            </option>
          ))}
        </select>

        <select
          value={selectedTime}
          onChange={e => setSelectedTime(e.target.value)}
          className="p-2 border rounded-lg w-1/2"
        >
          <option value="">Leaving Time</option>
          {TIMES.map(time => (
            <option key={time} value={time}>
              {time}
            </option>
          ))}
        </select>
      </div>

      {/* Bus List */}
      <div className="grid gap-4">
        {filteredBuses.length === 0 && (
          <p className="text-gray-500 text-center">
            No buses available for selected preferences
          </p>
        )}

        {filteredBuses.map(bus => (
          <div
            key={bus.id}
            className="bg-white p-4 rounded-xl shadow flex justify-between items-center"
          >
            <div>
              <p className="font-semibold text-lg">{bus.route}</p>
              <p className="text-sm text-gray-600">
                Bus No: {bus.busNo} • Time: {bus.time}
              </p>
            </div>

            <button
              onClick={() => navigate(`/student/seat-layout/${bus.id}`)}
              className="bg-vitblue text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90"
            >
              Select Seats
            </button>
          </div>
        ))}
      </div>
    </PageWrapper>
  )
}

export default StudentDashboard
