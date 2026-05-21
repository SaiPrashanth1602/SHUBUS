import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import PageWrapper from "../components/layout/PageWrapper"
import { auth } from "../config/firebase"
import { claimSeat } from "../services/bookingServices"
import {
  listenToBusLocation,
  checkGPSPermission,
  getStudentPosition,
  GPS_STATUS,
} from "../services/gpsService"


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


// ── GPS STATUS INDICATOR COMPONENT ──
function GPSIndicator({ label, status, detail }) {
  const configs = {
    [GPS_STATUS.LOADING]: {
      dot: "bg-yellow-400 animate-pulse",
      text: "text-yellow-600",
      icon: "⏳",
      message: "Checking...",
    },
    [GPS_STATUS.CONNECTED]: {
      dot: "bg-green-500",
      text: "text-green-600",
      icon: "✅",
      message: "Connected",
    },
    [GPS_STATUS.DENIED]: {
      dot: "bg-red-500",
      text: "text-red-500",
      icon: "🚫",
      message: "Permission Denied",
    },
    [GPS_STATUS.UNAVAILABLE]: {
      dot: "bg-gray-400",
      text: "text-gray-500",
      icon: "❌",
      message: "Not Available",
    },
    [GPS_STATUS.ERROR]: {
      dot: "bg-red-400",
      text: "text-red-500",
      icon: "⚠️",
      message: "Error",
    },
  }

  const cfg = configs[status] || configs[GPS_STATUS.LOADING]

  return (
    <div className={`flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 border border-gray-100`}>
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`}></span>
        <span className="text-sm font-semibold text-gray-700">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`text-xs font-bold ${cfg.text}`}>{cfg.message}</span>
        {detail && <span className="text-[10px] text-gray-400">({detail})</span>}
      </div>
    </div>
  )
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

  // ── SEPARATE GPS STATES ──
  const [busGPSStatus, setBusGPSStatus] = useState(GPS_STATUS.LOADING)
  const [studentGPSStatus, setStudentGPSStatus] = useState(GPS_STATUS.LOADING)
  const [studentGPSError, setStudentGPSError] = useState("")

  // ── BUS GPS: Firebase RTDB listener ──
  useEffect(() => {
    if (!bookingId || !gpsId) {
      navigate("/student/my-bookings")
      return
    }

    setBusGPSStatus(GPS_STATUS.LOADING)

    const unsub = listenToBusLocation(gpsId, (data) => {
      if (data && (data.lat || data.latitude)) {
        setBusLocation(data)
        setBusGPSStatus(GPS_STATUS.CONNECTED)
      } else {
        setBusGPSStatus(GPS_STATUS.UNAVAILABLE)
      }
    })

    // If no data arrives within 10 seconds, mark as unavailable
    const timeout = setTimeout(() => {
      setBusGPSStatus(prev =>
        prev === GPS_STATUS.LOADING ? GPS_STATUS.UNAVAILABLE : prev
      )
    }, 10000)

    return () => {
      unsub && unsub()
      clearTimeout(timeout)
    }
  }, [bookingId, gpsId, navigate])

  // ── STUDENT GPS: Check permission + attempt position ──
  useEffect(() => {
    const checkStudentGPS = async () => {
      setStudentGPSStatus(GPS_STATUS.LOADING)

      // Step 1: Check permission
      const permission = await checkGPSPermission()

      if (permission === "denied") {
        setStudentGPSStatus(GPS_STATUS.DENIED)
        setStudentGPSError("Location permission denied. Enable it in browser settings.")
        return
      }

      if (permission === "unavailable") {
        setStudentGPSStatus(GPS_STATUS.UNAVAILABLE)
        setStudentGPSError("Geolocation not supported on this device.")
        return
      }

      // Step 2: Attempt to get coordinates
      const result = await getStudentPosition()
      setStudentGPSStatus(result.status)

      if (result.error) {
        setStudentGPSError(result.error)
      }
    }

    checkStudentGPS()
  }, [])

  const handleClaim = async () => {
    if (loading) return

    setError("")
    setLoading(true)

    try {
      // Validate bus GPS
      if (!busLocation) {
        throw new Error("Waiting for bus GPS signal...")
      }

      // Validate student GPS permission
      if (studentGPSStatus === GPS_STATUS.DENIED) {
        throw new Error("GPS permission denied. Please allow location access in your browser settings.")
      }

      if (studentGPSStatus === GPS_STATUS.UNAVAILABLE) {
        throw new Error("GPS not available on this device.")
      }

      // Get fresh student position
      const posResult = await getStudentPosition()

      if (posResult.status !== GPS_STATUS.CONNECTED) {
        throw new Error(posResult.error || "Could not get your location")
      }

      const studentLat = posResult.coords.latitude
      const studentLng = posResult.coords.longitude

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


  // ── Can user attempt claim? ──
  const canAttemptClaim = busGPSStatus === GPS_STATUS.CONNECTED && studentGPSStatus !== GPS_STATUS.DENIED


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

        {/* ── TWO SEPARATE GPS STATUS INDICATORS (always visible) ── */}
        <div className="space-y-2 mb-4">
          <GPSIndicator
            label="Bus GPS"
            status={busGPSStatus}
          />
          <GPSIndicator
            label="Your GPS"
            status={studentGPSStatus}
            detail={studentGPSError && studentGPSStatus !== GPS_STATUS.CONNECTED ? studentGPSError : ""}
          />
        </div>

        {/* ── GPS HELP MESSAGE ── */}
        {studentGPSStatus === GPS_STATUS.DENIED && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            <p className="text-xs text-red-600 font-semibold">
              📍 Location access is required to verify you're on the bus.
            </p>
            <p className="text-[10px] text-red-500 mt-1">
              Go to your browser settings → Site permissions → Location → Allow for this site.
            </p>
          </div>
        )}

        {busGPSStatus === GPS_STATUS.UNAVAILABLE && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-4">
            <p className="text-xs text-yellow-700 font-semibold">
              🚌 Bus GPS signal not available yet. The driver may not have started tracking.
            </p>
          </div>
        )}


        {error && <p className="text-red-500 mt-3 text-sm font-medium">{error}</p>}

        <button
          onClick={handleClaim}
          disabled={loading || !canAttemptClaim}
          className={`mt-6 w-full py-3 rounded-lg font-bold transition-all ${
            canAttemptClaim && !loading
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {loading ? "Claiming…" : !canAttemptClaim ? "GPS Required" : "Confirm Claim"}
        </button>
      </div>
    </PageWrapper>
  )
}

export default SeatClaim