import { useState, useEffect } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import PageWrapper from "../components/layout/PageWrapper"
import { auth, db } from "../config/firebase"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"
import { bookSeat, subscribeBookedSeats } from "../services/bookingServices"


// 🚌 SEAT LAYOUT CONSTANT
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

// --- VISUAL COMPONENTS ---
const SteeringWheel = () => (
  <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-full border-4 border-gray-800 flex items-center justify-center shadow-sm bg-transparent z-10">
    <div className="absolute w-1 h-full bg-gray-800"></div>
    <div className="absolute w-full h-1 bg-gray-800 rotate-45"></div>
    <div className="absolute w-full h-1 bg-gray-800 -rotate-45"></div>
    <div className="w-3 h-3 md:w-4 md:h-4 bg-gray-900 rounded-full z-20 shadow-inner"></div>
  </div>
)

const DriverSeat = () => (
  <div className="w-12 h-12 md:w-14 md:h-14 bg-gray-700 rounded-lg border-b-4 border-gray-900 relative shadow-md flex justify-center items-center">
    <span className="text-[8px] md:text-[9px] text-gray-300 font-bold text-center leading-tight">DRIVER<br />SEAT</span>
  </div>
)

const BigWheel = ({ className }) => (
  <div className={`absolute w-3 md:w-4 h-20 md:h-24 bg-black rounded-lg shadow-2xl border-l-2 border-gray-800 z-0 ${className}`}>
    <div className="w-full h-3 bg-gray-700 mt-2 opacity-30"></div>
    <div className="w-full h-3 bg-gray-700 mt-2 opacity-30"></div>
    <div className="w-full h-3 bg-gray-700 mt-2 opacity-30"></div>
    <div className="w-full h-3 bg-gray-700 mt-2 opacity-30"></div>
  </div>
)

const Stairs = () => (
  <div className="flex flex-col items-center justify-center w-12 md:w-16 space-y-1">
    <div className="w-full h-3 md:h-4 bg-gray-300 border border-gray-400 rounded-sm shadow-sm"></div>
    <div className="w-full h-3 md:h-4 bg-gray-300 border border-gray-400 rounded-sm shadow-sm"></div>
    <div className="w-full h-3 md:h-4 bg-gray-300 border border-gray-400 rounded-sm shadow-sm"></div>
    <span className="text-[8px] md:text-[10px] text-green-700 font-bold mt-1 tracking-widest">ENTRY</span>
  </div>
)

function SeatLayout() {
  const { busId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
const [busDetails, setBusDetails] = useState(null)
  // 🆕 GET TIME & ROUTE FROM PREVIOUS PAGE
  const { route: routeName = "Bus Route", time: busTime } = location.state || {}

  // Logic State
  const [selectedSeat, setSelectedSeat] = useState(null)
  const [bookedSeats, setBookedSeats] = useState([])
  const [loading, setLoading] = useState(false)

  // 1. Load Real Booked Seats from Firebase
  useEffect(() => {
    const unsubscribe = subscribeBookedSeats(busId, (data) => {
      setBookedSeats(data)
    })

    return () => unsubscribe()
  }, [busId])
  const totalSeats = busDetails?.totalSeats || 50
const bookedCount = bookedSeats.length
const remainingSeats = totalSeats - bookedCount


useEffect(() => {
  const fetchBusFromShuttle = async () => {
    try {
      // 1️⃣ Get shuttle
      const shuttleSnap = await getDoc(doc(db, "shuttles", busId))

      if (!shuttleSnap.exists()) {
        console.log("Shuttle not found")
        return
      }

      const shuttleData = shuttleSnap.data()
      const realBusId = shuttleData.busId

      if (!realBusId) {
        console.log("No bus linked to shuttle")
        return
      }

      // 2️⃣ Get bus
      const busSnap = await getDoc(doc(db, "buses", realBusId))

      if (busSnap.exists()) {
        setBusDetails(busSnap.data())
      } else {
        console.log("Bus not found")
      }

    } catch (err) {
      console.error("Error fetching bus details:", err)
    }
  }

  if (busId) fetchBusFromShuttle()
}, [busId])



  // Handle clicking a seat
  const handleSeatClick = (seatId) => {
    const booking = bookedSeats.find(b => b.seatNumber === seatId)
    if (booking) return
    setSelectedSeat(seatId === selectedSeat ? null : seatId)
  }

  // 2. Confirm & Save to Firebase (ROBUST VERSION)
  const handleConfirm = async () => {
    if (!selectedSeat) return alert("Please select a seat")
    const user = auth.currentUser
    if (!user) return alert("Please login")

    setLoading(true)
    try {
      // 🛡️ DOUBLE BOOKING CHECK (Simplified for clarity)
      const q = query(collection(db, "bookings"), where("studentId", "==", user.uid))
      const snapshot = await getDocs(q)
      const today = new Date().toISOString().split('T')[0]; // Simple comparison

      const hasBookingToday = snapshot.docs.some(doc => doc.data().date === today)
      if (hasBookingToday) {
        alert("⛔ YOU HAVE ALREADY BOOKED A SEAT TODAY!")
        navigate("/student/my-bookings")
        return
      }

      const offset = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(Date.now() + offset).toISOString().split('T')[0];

      await bookSeat(user.uid, busId, selectedSeat, {
        route: routeName,
        date: istDate,
        time: busTime
      })

      // We navigate to my-bookings because the Transaction doesn't easily return the new Doc ID
      // and StudentBooking will show the latest ticket at the top anyway.
      navigate("/student/my-bookings")

    } catch (error) {
      alert("Booking Failed: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  // --- 🎨 UI SECTION ---
  return (
    <PageWrapper role="student">
      <div className="text-center mb-4">
  <h1 className="text-xl md:text-2xl font-bold text-vitblue">
    Bus No: <span className="text-gray-800">{busDetails?.busNo || "Loading..."}</span>
  </h1>

  <h2 className="text-md md:text-lg font-semibold text-gray-700 mt-1">
    Shuttle Route: <span className="text-gray-600">{routeName}</span>
  </h2>
</div>

<p className="text-gray-600 mb-6 text-center text-sm">
  <span className="font-semibold">{bookedCount}</span> / {totalSeats} seats booked •{" "}
  <span className="font-semibold text-green-600">{remainingSeats}</span> remaining
</p>



      {/* HORIZONTAL SCROLL WRAPPER */}
      <div className="w-full overflow-x-hidden pb-12 px-2 flex justify-center relative">

        {/* BUS WRAPPER */}
        <div className="relative w-[92%] md:w-[400px] max-w-[400px]">

          {/* WHEELS */}
          <BigWheel className="top-40 -left-3 md:-left-4" />
          <BigWheel className="top-40 -right-3 md:-right-4" />
          <BigWheel className="bottom-[28%] -left-3 md:-left-4" />
          <BigWheel className="bottom-[28%] -right-3 md:-right-4" />

          {/* BUS BODY */}
          <div className="relative bg-yellow-400/80 border-[4px] border-yellow-600 rounded-[2rem] md:rounded-[3rem] p-3 md:p-6 w-full shadow-2xl overflow-hidden z-10 backdrop-blur-sm">

            {/* GLASSY WINDOWS */}
            <div className="absolute top-32 bottom-20 left-1 w-2 md:w-3 bg-blue-300 border-r border-blue-400 opacity-60 flex flex-col justify-between py-2 rounded-l-md shadow-inner"></div>
            <div className="absolute top-32 bottom-20 right-1 w-2 md:w-3 bg-blue-300 border-l border-blue-400 opacity-60 flex flex-col justify-between py-2 rounded-r-md shadow-inner"></div>

            {/* Front Headlights */}
            <div className="absolute top-0 left-8 md:left-12 w-8 md:w-10 h-6 bg-yellow-100 rounded-b-xl shadow-[0_0_20px_rgba(255,255,255,0.8)] z-20"></div>
            <div className="absolute top-0 right-8 md:right-12 w-8 md:w-10 h-6 bg-yellow-100 rounded-b-xl shadow-[0_0_20px_rgba(255,255,255,0.8)] z-20"></div>

            {/* Front Windshield */}
            <div className="w-full h-8 md:h-10 bg-gradient-to-b from-blue-900 to-blue-500 rounded-t-2xl md:rounded-t-3xl border-b-[4px] border-gray-800 opacity-90 mb-4 mt-6 mx-auto shadow-lg relative overflow-hidden">
              <div className="absolute top-1 right-10 w-20 h-40 bg-white opacity-10 rotate-45 transform skew-x-12"></div>
            </div>

            {/* DRIVER CABIN */}
            <div className="flex justify-between items-start mb-6 px-1 md:px-2 relative">
              <div className="flex flex-col items-center justify-center pt-2 w-16 md:w-20 border-r-2 border-dashed border-amber-500/30">
                <Stairs />
              </div>

              <div className="flex flex-col items-center w-20 md:w-24 relative">
                <div className="w-full h-6 md:h-8 bg-gray-800 rounded-lg mb-2 shadow-md flex justify-center items-center border-b-2 border-gray-600">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-red-500 rounded-full"></div>
                </div>
                <SteeringWheel />
                <div className="h-3 md:h-4"></div>
                <DriverSeat />
              </div>
            </div>

            {/* SEATS GRID */}
            <div className="space-y-2 md:space-y-3 px-1 md:px-3 z-10 relative">
              {BUS_SEAT_LAYOUT.map((row, rowIndex) => (
                <div
                  key={rowIndex}
                  className="grid gap-2 md:gap-3 items-center"
                  style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr" }}
                >
                  {row.map((seat, seatIndex) => {
                    if (seat === null) return <div key={`aisle-${rowIndex}-${seatIndex}`} />

                    const booking = bookedSeats.find(b => b.seatNumber === seat)
                    const isBooked = !!booking
                    const isClaimed = booking?.claimed
                    const isSelected = selectedSeat === seat

                    let seatStyle = "bg-white text-gray-700 border-b-4 border-gray-300 hover:border-vitblue hover:bg-blue-50 shadow-sm"

                    if (isBooked && !isClaimed) {
                      seatStyle = "bg-red-100 text-red-400 border-b-4 border-red-300 cursor-not-allowed"
                    }

                    if (isClaimed) {
                      seatStyle = "bg-red-700 text-white border-b-4 border-red-900 cursor-not-allowed shadow-lg"
                    }

                    if (isSelected) {
                      seatStyle = "bg-vitblue text-white border-b-4 border-blue-800 shadow-lg transform scale-105"
                    }

                    return (
                      <button
                        key={seat}
                        onClick={() => handleSeatClick(seat)}
                        disabled={isBooked || loading}
                        className={`
                            w-full aspect-square rounded-md 
                            font-bold text-[10px] md:text-xs flex items-center justify-center 
                            transition-all duration-200 shadow-sm
                            ${seatStyle}
                        `}
                      >
                        {seat}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* REAR GLASS PANEL */}
            <div className="w-2/3 h-7 md:h-8 bg-gradient-to-t from-blue-900 to-blue-500 border-t-[3px] border-gray-800 opacity-90 mx-auto mt-2 rounded-b-2xl md:rounded-b-3xl shadow-lg relative overflow-hidden">
              <div className="absolute bottom-1 left-4 w-10 h-7 bg-white opacity-10 rotate-45 transform skew-x-12"></div>
            </div>

            {/* Back Lights */}
            <div className="absolute bottom-0 left-8 w-8 md:w-10 h-3 bg-red-600 rounded-t-lg shadow-[0_0_15px_rgba(220,38,38,0.8)] border border-red-800"></div>
            <div className="absolute bottom-0 right-8 w-8 md:w-10 h-3 bg-red-600 rounded-t-lg shadow-[0_0_15px_rgba(220,38,38,0.8)] border border-red-800"></div>

          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-6 text-sm mb-24">
        <div className="flex items-center gap-2"><div className="w-5 h-5 bg-white border-b-4 border-gray-300 rounded"></div> Available</div>
        <div className="flex items-center gap-2"><div className="w-5 h-5 bg-vitblue border-b-4 border-blue-800 rounded"></div> Selected</div>
        <div className="flex items-center gap-2"><div className="w-5 h-5 bg-red-50 border-b-4 border-red-100 rounded text-red-300 text-xs flex items-center justify-center font-bold">X</div> Booked</div>
        
          <div className="w-5 h-5 bg-red-600 border-b-4 border-red-800 rounded"></div>Claimed
          
        

      </div>

      {/* Mobile Confirm Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg flex justify-between items-center md:hidden z-50">
        <div className="text-sm">
          <p className="text-gray-500">Seat</p>
          <p className="font-bold text-vitblue text-lg">{selectedSeat || "-"}</p>
        </div>
        <button
          onClick={handleConfirm}
          disabled={!selectedSeat || loading}
          className={`px-8 py-3 rounded-lg font-bold ${selectedSeat && !loading ? "bg-vitblue text-white" : "bg-gray-200 text-gray-400"}`}
        >
          {loading ? "..." : "Confirm"}
        </button>
      </div>

      {/* Desktop Button */}
      <div className="hidden md:flex justify-center pb-12">
        <button
          onClick={handleConfirm}
          disabled={!selectedSeat || loading}
          className={`px-12 py-3 rounded-xl font-bold shadow-lg transform transition active:scale-95 ${selectedSeat && !loading ? "bg-vitblue text-white hover:bg-blue-700" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}
        >
          {loading ? "Booking Ticket..." : "Confirm Booking"}
        </button>
      </div>

    </PageWrapper>
  )
}

export default SeatLayout
