import { useState, useEffect } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import PageWrapper from "../components/layout/PageWrapper"
import { auth } from "../config/firebase" 
import { bookSeat, getBookedSeats } from "../services/bookingServices"

// 🚌 Yoha's Layout Configuration
const BUS_SEAT_LAYOUT = [
  ["1A", null, null, "1B", "1C", "1D"],
  ["2A", "2B", null, "2C", "2D", "2E"],
  ["3A", "3B", null, "3C", "3D", "3E"],
  ["4A", "4B", null, "4C", "4D", "4E"],
  ["5A", "5B", null, "5C", "5D", "5E"],
  ["6A", "6B", null, "6C", "6D", "6E"],
  ["7A", "7B", null, "7C", "7D", "7E"],
  ["8A", "8B", null, "8C", "8D", "8E"],
  ["9A", "9B", null, "9C", "9D", "9E"],
  ["10A", "10B", "10C", "10D", "10E", "10F"],
]

function SeatLayout() {
  const { busId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  
  // 🧠 Logic State
  const [selectedSeat, setSelectedSeat] = useState(null)
  const [bookedSeats, setBookedSeats] = useState([]) // Stores real booked seats from Firebase
  const [loading, setLoading] = useState(false)

  // Get Route Name passed from Dashboard (or fallback)
  const routeName = location.state?.route || "Bus Route"
  const departureTime = location.state?.time || ""

  // ✨ 1. Load Real Booked Seats from Firebase
  useEffect(() => {
    const fetchSeats = async () => {
      try {
        const takenSeats = await getBookedSeats(busId)
        setBookedSeats(takenSeats)
      } catch (error) {
        console.error("Error loading seats:", error)
      }
    }
    fetchSeats()
  }, [busId])

  // Handle clicking a seat
  const handleSeatClick = (seatId) => {
    if (bookedSeats.includes(seatId)) return // Ignore if already booked
    setSelectedSeat(seatId === selectedSeat ? null : seatId) // Toggle selection
  }

  // ✨ 2. Confirm & Save to Firebase
  const handleConfirm = async () => {
    if (!selectedSeat) {
      alert("Please select a seat")
      return
    }

    const user = auth.currentUser
    if (!user) {
      alert("You must be logged in to book a seat!")
      return
    }

    try {
      setLoading(true)
      
      const studentId = user.uid 
      
      // Save "1A" or "2B" instead of just numbers now
      await bookSeat(studentId, busId, selectedSeat, { route: routeName })

      // Success!
      navigate("/student/booking", {
        state: {
          busId,
          seatNumber: selectedSeat, // e.g., "3D"
          status: "confirmed",
          route: routeName
        }
      })
    } catch (error) {
      console.error("Booking Error:", error)
      alert("Booking Failed: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageWrapper role="student">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-vitblue">Select Your Seat</h1>
        <div className="flex items-center gap-2 text-gray-600 mt-1">
            <span className="font-semibold">{routeName}</span>
            <span>•</span>
            <span className="bg-blue-100 text-vitblue text-xs px-2 py-0.5 rounded">{departureTime}</span>
        </div>
      </div>

      {/* 🏟️ Yoha's Visual Seat Layout */}
      <div className="bg-white p-6 rounded-xl shadow w-fit mx-auto border border-gray-100">

        {/* Entrance / Driver Labels */}
        <div
          className="grid text-xs text-gray-400 font-bold tracking-wider mb-8"
          style={{ gridTemplateColumns: "3rem 3rem 2rem 3rem 3rem 3rem" }}
        >
          <span className="col-span-2 text-left border-l-4 border-green-400 pl-2">ENTRY</span>
          <span className="col-start-4 col-span-3 text-right pr-2 border-r-4 border-gray-400">DRIVER</span>
        </div>

        {/* The Grid */}
        <div className="space-y-3">
          {BUS_SEAT_LAYOUT.map((row, rowIndex) => {
            const isLastRow = rowIndex === BUS_SEAT_LAYOUT.length - 1

            return (
              <div
                key={rowIndex}
                className="grid gap-3 items-center"
                style={{
                  gridTemplateColumns: isLastRow
                    ? "3rem 3rem 3rem 3rem 3rem 3rem" // Back row is full
                    : "3rem 3rem 3rem 3rem 3rem 3rem", // Standard row
                }}
              >
                {row.map((seat, seatIndex) => {
                  // Render Aisle
                  if (seat === null) {
                    return <div key={`aisle-${rowIndex}-${seatIndex}`} className="w-8" />
                  }

                  // Check Status
                  const isBooked = bookedSeats.includes(seat)
                  const isSelected = selectedSeat === seat

                  // Dynamic Styles
                  let seatStyle = "bg-gray-100 text-gray-600 hover:bg-blue-50 border-gray-200"
                  if (isBooked) seatStyle = "bg-red-100 text-red-400 cursor-not-allowed border-red-100"
                  if (isSelected) seatStyle = "bg-vitblue text-white shadow-lg shadow-blue-200 border-vitblue transform scale-105"

                  return (
                    <button
                      key={seat}
                      onClick={() => handleSeatClick(seat)}
                      disabled={isBooked || loading}
                      className={`w-12 h-12 rounded-lg font-bold text-sm border transition-all duration-200 flex items-center justify-center ${seatStyle}`}
                    >
                      {seat}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-8 text-sm font-medium text-gray-600">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 bg-gray-100 border border-gray-200 rounded-md"></span> Available
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 bg-vitblue rounded-md shadow-sm"></span> Selected
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 bg-red-100 border border-red-100 rounded-md"></span> Booked
        </div>
      </div>

      {/* Confirm Button */}
      <div className="flex justify-center mt-8 pb-10">
        <button
          onClick={handleConfirm}
          disabled={loading || !selectedSeat}
          className={`w-full max-w-xs px-6 py-4 rounded-xl font-bold text-lg shadow-xl transition-all ${
            loading || !selectedSeat
              ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
              : "bg-vitblue text-white hover:shadow-2xl hover:-translate-y-1 active:translate-y-0"
          }`}
        >
          {loading ? "Booking Ticket..." : selectedSeat ? `Confirm Seat ${selectedSeat}` : "Select a Seat"}
        </button>
      </div>
    </PageWrapper>
  )
}

export default SeatLayout