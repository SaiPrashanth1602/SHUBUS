import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import PageWrapper from "../components/layout/PageWrapper"
import { auth } from "../config/firebase"
import { claimSeat } from "../services/bookingServices"
import { listenToBusLocation } from "../services/gpsService"


const MAX_DISTANCE = 50 // meters

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) ** 2

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

function SeatClaim() {
  const [success, setSuccess] = useState(false)

  const { state } = useLocation()
  const navigate = useNavigate()
  const user = auth.currentUser

  const { bookingId, gpsId } = state || {}

  const [busLocation, setBusLocation] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!bookingId || !gpsId) {
      navigate("/student/my-bookings")
      return
    }

    const unsub = listenToBusLocation(gpsId, setBusLocation)
    return () => unsub && unsub()
  }, [bookingId, gpsId, navigate])

  const handleClaim = async () => {
    if (loading) return

    setError("")
    setLoading(true)

    try {
      if (!busLocation) {
        throw new Error("Waiting for bus GPS signal...")
      }

      if (!navigator.geolocation) {
        throw new Error("Geolocation not supported on this device")
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        )
      })

      const studentLat = position.coords.latitude
      const studentLng = position.coords.longitude

      const busLat = busLocation.lat ?? busLocation.latitude
      const busLng = busLocation.lng ?? busLocation.longitude

      if (typeof busLat !== "number" || typeof busLng !== "number") {
        throw new Error("Bus GPS data invalid")
      }

      const distance = getDistance(studentLat, studentLng, busLat, busLng)
      console.log("📍 Student:", studentLat, studentLng);
      console.log("🚌 Bus:", busLat, busLng);
      console.log("📏 Distance:", distance, "meters");
      if (distance > MAX_DISTANCE) {
        throw new Error(
          `You are too far from the bus (${Math.round(distance)}m away)`
        )
      }

      await claimSeat(bookingId, user.uid)

      setSuccess(true)

      // wait 1.5 seconds to show animation
      setTimeout(() => {
        navigate("/student/my-bookings")
      }, 1500)


    } catch (e) {
      setError(e.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }




  return (

    <PageWrapper role="student">
      {(loading || success) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300">
          <div className="bg-white px-10 py-8 rounded-2xl shadow-2xl text-center animate-fadeIn">

            {!success && (
              <>
                <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="font-semibold text-gray-700">
                  Verifying your location...
                </p>
              </>
            )}

            {success && (
              <>
                <div className="w-16 h-16 mx-auto mb-4 relative">
                  <div className="absolute inset-0 bg-green-100 rounded-full animate-ping"></div>
                  <div className="relative w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-white text-3xl font-bold animate-scaleIn">
                    ✓
                  </div>
                </div>
                <p className="font-semibold text-green-700 text-lg">
                  Seat Claimed!
                </p>
              </>
            )}

          </div>
        </div>
      )}
      <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow">
        <h1 className="text-xl font-bold mb-4 text-green-600">
          Claim Your Seat
        </h1>

        {busLocation ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Live Bus GPS Connected
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-400 animate-pulse">
            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
            Connecting to Bus GPS...
          </div>
        )}


        {error && <p className="text-red-500 mt-3">{error}</p>}

        <button
          onClick={handleClaim}
          disabled={loading}
          className="mt-6 w-full bg-green-600 text-white py-3 rounded-lg font-bold"
        >
          {loading ? "Claiming…" : "Confirm Claim"}
        </button>
      </div>
    </PageWrapper>
  )
}

export default SeatClaim