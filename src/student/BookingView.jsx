import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import PageWrapper from "../components/layout/PageWrapper"

function BookingView() {
  const { state } = useLocation()
  const navigate = useNavigate()

  // ✅ ADD IT HERE
  const [claimed, setClaimed] = useState(false)

  if (!state) {
    return (
      <PageWrapper role="student">
        <p className="text-center text-gray-500">
          No booking found
        </p>
      </PageWrapper>
    )
  }

  const { busId, seatNumber } = state

  return (
    <PageWrapper role="student">
      <h1 className="text-2xl font-bold text-vitblue mb-6">
        Booking Confirmed 🎉
      </h1>

      <div className="bg-white p-6 rounded-xl shadow max-w-md mx-auto">
        <div className="space-y-3">
          <p><b>Bus ID:</b> {busId}</p>
          <p><b>Seat Number:</b> {seatNumber}</p>
          <p>
            <b>Status:</b>{" "}
            <span className={claimed ? "text-green-600" : "text-yellow-600"}>
              {claimed ? "Claimed" : "Booked"}
            </span>
          </p>
        </div>

        {!claimed ? (
          <button
            onClick={() => {
              setClaimed(true)
              navigate("/student/seat-claim", { state: { ticket } })
            }}
            className="mt-6 w-full border border-vitblue text-vitblue py-3 rounded-lg font-semibold hover:bg-vitlight"
          >
            Claim Seat
          </button>
        ) : (
          <p className="mt-6 text-green-600 text-center font-semibold">
            Seat Already Claimed
          </p>
        )}

        <button
          onClick={() => navigate("/student")}
          className="mt-3 w-full bg-vitblue text-white py-3 rounded-lg font-semibold hover:opacity-90"
        >
          Back to Dashboard
        </button>
      </div>
    </PageWrapper>
  )
}

export default BookingView