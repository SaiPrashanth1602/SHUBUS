import { useLocation, useNavigate } from "react-router-dom"
import PageWrapper from "../components/layout/PageWrapper"

function BookingView() {
  const { state } = useLocation()
  const navigate = useNavigate()

  if (!state) {
    return (
      <PageWrapper role="student">
        <p className="text-center text-gray-500">No booking found</p>
      </PageWrapper>
    )
  }

  const { bookingId, busId, seatNumber, route, time } = state

  return (
    <PageWrapper role="student">
      <h1 className="text-2xl font-bold text-blue-600 mb-6">
        Booking Confirmed 🎉
      </h1>

      <div className="bg-white p-6 rounded-xl shadow max-w-md mx-auto space-y-3">
        <p><b>Route:</b> {route}</p>
        <p><b>Time:</b> {time}</p>
        <p><b>Seat:</b> {seatNumber}</p>

        <button
          onClick={() =>
            navigate("/student/seat-claim", {
              state: {
                bookingId,
                busId,
                seatNumber,
                route,
                time
              }
            })
          }
          className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg font-semibold"
        >
          Claim Seat
        </button>

        <button
          onClick={() => navigate("/student")}
          className="mt-3 w-full border border-blue-600 text-blue-600 py-3 rounded-lg font-semibold"
        >
          Back to Dashboard
        </button>
      </div>
    </PageWrapper>
  )
}

export default BookingView