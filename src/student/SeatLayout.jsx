import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import PageWrapper from "../components/layout/PageWrapper"

const TOTAL_SEATS = 40

// Dummy booked seats
const BOOKED_SEATS = [3, 7, 12, 18, 25, 31]

function SeatLayout() {
  const { busId } = useParams()
  const navigate = useNavigate()
  const [selectedSeat, setSelectedSeat] = useState(null)

  const handleSeatClick = (seatNumber) => {
    if (BOOKED_SEATS.includes(seatNumber)) return
    setSelectedSeat(seatNumber)
  }

  const handleConfirm = () => {
    if (!selectedSeat) {
      alert("Please select a seat")
      return
    }

    navigate("/student/booking", {
  state: {
    busId,
    seatNumber: selectedSeat
  }
})

  }

  return (
    <PageWrapper role="student">
      <h1 className="text-2xl font-bold text-vitblue mb-2">
        Select Your Seat
      </h1>

      <p className="text-gray-600 mb-6">
        Bus ID: <span className="font-semibold">{busId}</span>
      </p>

      {/* Seat Grid */}
      <div className="bg-white p-6 rounded-xl shadow max-w-md mx-auto">
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: TOTAL_SEATS }).map((_, index) => {
            const seatNumber = index + 1
            const isBooked = BOOKED_SEATS.includes(seatNumber)
            const isSelected = selectedSeat === seatNumber

            let seatStyle = "bg-gray-200 text-gray-700"
            if (isBooked) seatStyle = "bg-red-400 text-white cursor-not-allowed"
            if (isSelected) seatStyle = "bg-vitblue text-white"

            return (
              <button
                key={seatNumber}
                onClick={() => handleSeatClick(seatNumber)}
                className={`h-12 rounded-lg font-semibold ${seatStyle}`}
              >
                {seatNumber}
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 bg-gray-200 rounded"></span> Available
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 bg-vitblue rounded"></span> Selected
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 bg-red-400 rounded"></span> Booked
        </div>
      </div>

      {/* Confirm Button */}
      <div className="flex justify-center mt-6">
        <button
          onClick={handleConfirm}
          className="bg-vitblue text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90"
        >
          Confirm Seat
        </button>
      </div>
    </PageWrapper>
  )
}

export default SeatLayout
