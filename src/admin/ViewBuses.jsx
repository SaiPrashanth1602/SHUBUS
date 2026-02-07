import PageWrapper from "../components/layout/PageWrapper"

const DUMMY_BUSES = [
  { id: 1, route: "VELACHERY", time: "1:20", busNo: "TN 09 AB 2345", type: "Non-AC" },
  { id: 2, route: "TAMBARAM", time: "1:45", busNo: "TN 10 CD 7812", type: "AC" }
]

function ViewBuses() {
  return (
    <PageWrapper role="admin">
      <h1 className="text-2xl font-bold text-vitblue mb-6">
        Running Buses
      </h1>

      <div className="grid gap-4">
        {DUMMY_BUSES.map(bus => (
          <div
            key={bus.id}
            className="bg-white p-4 rounded-xl shadow"
          >
            <p className="font-semibold">{bus.route}</p>
            <p className="text-sm text-gray-600">
              {bus.busNo} • {bus.time} • {bus.type}
            </p>
          </div>
        ))}
      </div>
    </PageWrapper>
  )
}

export default ViewBuses
