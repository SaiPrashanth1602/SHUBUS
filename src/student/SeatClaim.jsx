import { useState } from "react"
import PageWrapper from "../components/layout/PageWrapper"
import { useNavigate } from "react-router-dom"


function SeatClaim() {
  const [claimed, setClaimed] = useState(false)

  const handleClaim = () => {
    // future: GPS + radius validation
    setClaimed(true)
  }

  return (
    <PageWrapper role="student">
      <h1 className="text-2xl font-bold text-vitblue mb-4">
        Seat Claim
      </h1>

      <div className="bg-white p-6 rounded-xl shadow max-w-md mx-auto text-center">
        {!claimed ? (
          <>
            <p className="text-gray-700 mb-4">
              Please claim your seat when you are near the bus.
            </p>

            <div className="bg-yellow-100 text-yellow-800 p-3 rounded-lg text-sm mb-6">
              ⚠️ Seat claim will be verified using GPS (future)
            </div>

            <button
              onClick={handleClaim}
              className="w-full bg-vitblue text-white py-3 rounded-lg font-semibold hover:opacity-90"
            >
              Claim Seat
            </button>
          </>
        ) : (
          <>
            <div className="text-green-600 text-lg font-semibold mb-4">
              ✅ Seat Successfully Claimed
            </div>
<button
  onClick={() => navigate("/student/booking")}
  className="mt-4 w-full bg-vitblue text-white py-3 rounded-lg font-semibold"
>
  Back to Booking
</button>

            <p className="text-gray-600 text-sm">
              You may now board the bus.
            </p>
          </>
        )}
      </div>
    </PageWrapper>
  )
}

export default SeatClaim
