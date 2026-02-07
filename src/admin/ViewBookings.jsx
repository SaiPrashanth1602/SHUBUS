import PageWrapper from "../components/layout/PageWrapper"

const DUMMY_BOOKINGS = [
  {
    id: 1,
    studentId: "21BCE1234",
    route: "VELACHERY",
    busNo: "TN 09 AB 2345",
    time: "1:20",
    seat: 12,
    status: "CLAIMED"
  },
  {
    id: 2,
    studentId: "21BCE4567",
    route: "TAMBARAM",
    busNo: "TN 10 CD 7812",
    time: "1:45",
    seat: 7,
    status: "BOOKED"
  },
  {
    id: 3,
    studentId: "21BCE8910",
    route: "SHOLINGANALLUR",
    busNo: "TN 14 JK 1123",
    time: "1:20",
    seat: 25,
    status: "BOOKED"
  }
]

function ViewBookings() {
  return (
    <PageWrapper role="admin">
      <h1 className="text-2xl font-bold text-vitblue mb-6">
        Student Bookings
      </h1>

      <div className="overflow-x-auto bg-white rounded-xl shadow">
        <table className="w-full text-left">
          <thead className="bg-vitlight">
            <tr>
              <th className="p-3">Student</th>
              <th className="p-3">Route</th>
              <th className="p-3">Bus</th>
              <th className="p-3">Time</th>
              <th className="p-3">Seat</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>

          <tbody>
            {DUMMY_BOOKINGS.map(b => (
              <tr key={b.id} className="border-t">
                <td className="p-3">{b.studentId}</td>
                <td className="p-3">{b.route}</td>
                <td className="p-3">{b.busNo}</td>
                <td className="p-3">{b.time}</td>
                <td className="p-3 font-semibold">{b.seat}</td>
                <td className="p-3">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      b.status === "CLAIMED"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {b.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageWrapper>
  )
}

export default ViewBookings
