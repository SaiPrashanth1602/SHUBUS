import { useState, useEffect, useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import PageWrapper from "../components/layout/PageWrapper"
import { listenToBusLocation } from "../services/gpsService"
import { useServerTime } from "../services/useServerTime"
import {
  getJourneyStatus,
  JourneyStatus,
  JOURNEY_BADGE,
} from "../services/bookingStatus"


function LiveTracking() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { serverTime, isLoaded: timeLoaded } = useServerTime()
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)

  const { bookingId, gpsId, route, time, date, seatNumber } = state || {}

  const [busLocation, setBusLocation] = useState(null)
  const [gpsOnline, setGpsOnline] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  // ── Redirect if no state ──
  useEffect(() => {
    if (!bookingId || !gpsId) {
      navigate("/student/my-bookings")
    }
  }, [bookingId, gpsId, navigate])

  // ── Subscribe to bus GPS ──
  useEffect(() => {
    if (!gpsId) return

    const unsub = listenToBusLocation(gpsId, (data) => {
      if (data && (data.lat || data.latitude)) {
        setBusLocation(data)
        setGpsOnline(true)
      } else {
        setGpsOnline(false)
      }
    })

    // If no data arrives within 10 seconds, mark as offline
    const timeout = setTimeout(() => {
      setGpsOnline(prev => prev ? prev : false)
    }, 10000)

    return () => {
      unsub && unsub()
      clearTimeout(timeout)
    }
  }, [gpsId])

  // ── Initialize Leaflet map ──
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Dynamically load Leaflet CSS if not already present
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      document.head.appendChild(link)
    }

    // Dynamically load Leaflet JS
    const loadLeaflet = async () => {
      if (!window.L) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script")
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          script.onload = resolve
          script.onerror = reject
          document.head.appendChild(script)
        })
      }

      // Initialize map with a default center (India)
      const map = window.L.map(mapRef.current).setView([12.9716, 79.1588], 15)

      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      mapInstanceRef.current = map
      setMapReady(true)
    }

    loadLeaflet().catch(err => {
      console.error("Failed to load Leaflet:", err)
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markerRef.current = null
        setMapReady(false)
      }
    }
  }, [])

  // ── Update marker when bus location changes ──
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !busLocation) return

    const lat = busLocation.lat ?? busLocation.latitude
    const lng = busLocation.lng ?? busLocation.longitude

    if (typeof lat !== "number" || typeof lng !== "number") return

    const map = mapInstanceRef.current

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
    } else {
      // Create a bus icon marker
      const busIcon = window.L.divIcon({
        html: '<div style="font-size: 28px; filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));">🚌</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        className: "",
      })

      markerRef.current = window.L.marker([lat, lng], { icon: busIcon }).addTo(map)
      markerRef.current.bindPopup(`<b>${route || "Bus"}</b><br/>Live Location`)
    }

    map.setView([lat, lng], map.getZoom())
  }, [busLocation, mapReady, route])

  // ── Compute journey status ──
  const journeyStatus = timeLoaded
    ? getJourneyStatus(date, time, serverTime)
    : JourneyStatus.UPCOMING

  const isDeparted = journeyStatus === JourneyStatus.DEPARTED
  const showMap = isDeparted && gpsOnline && busLocation

  // ── Determine what message to show ──
  const renderTrackingState = () => {
    if (!isDeparted) {
      const badge = JOURNEY_BADGE[journeyStatus]
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4">{badge?.icon || "⏳"}</div>
          <h2 className="text-lg font-bold text-gray-700 mb-2">
            Tracking will be available once journey starts
          </h2>
          <p className="text-sm text-gray-500 max-w-xs">
            {badge?.message || "Your bus hasn't departed yet."}
          </p>
          <div className={`mt-4 px-4 py-2 rounded-full text-xs font-bold uppercase border ${badge?.bg || "bg-blue-50"} ${badge?.text || "text-blue-600"} ${badge?.border || "border-blue-200"}`}>
            {badge?.label || "Upcoming"}
          </div>
        </div>
      )
    }

    if (!gpsOnline || !busLocation) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4 animate-pulse">📡</div>
          <h2 className="text-lg font-bold text-gray-700 mb-2">
            Waiting for bus to come online...
          </h2>
          <p className="text-sm text-gray-500 max-w-xs">
            The bus GPS device is not sending data yet. This may take a moment.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
            <span className="text-xs font-bold text-yellow-600 uppercase">GPS Offline</span>
          </div>
        </div>
      )
    }

    return null // Map will be shown instead
  }

  return (
    <PageWrapper role="student">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-vitblue">Live Tracking</h1>
            <p className="text-sm text-gray-500 mt-0.5">{route || "Bus Route"}</p>
          </div>
          <button
            onClick={() => navigate("/student/my-bookings")}
            className="text-sm font-bold text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition"
          >
            ← Back
          </button>
        </div>

        {/* Info Bar */}
        <div className="flex items-center gap-4 bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase">Seat</span>
            <span className="font-bold text-gray-800">{seatNumber || "?"}</span>
          </div>
          <div className="w-px h-5 bg-gray-200"></div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase">Departure</span>
            <span className="font-bold text-gray-800">{time || "N/A"}</span>
          </div>
          <div className="w-px h-5 bg-gray-200"></div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${gpsOnline ? "bg-green-500" : "bg-gray-400"}`}></span>
            <span className={`text-xs font-bold uppercase ${gpsOnline ? "text-green-600" : "text-gray-400"}`}>
              {gpsOnline ? "Online" : "Offline"}
            </span>
          </div>
        </div>

        {/* Map or Status Message */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {!showMap && renderTrackingState()}

          {/* Leaflet Map Container — always mounted but hidden when not active */}
          <div
            ref={mapRef}
            style={{
              height: showMap ? "400px" : "0px",
              opacity: showMap ? 1 : 0,
              transition: "height 0.3s, opacity 0.3s",
              overflow: "hidden",
            }}
          />

          {/* Distance info when tracking is active */}
          {showMap && busLocation && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-xs font-bold text-green-600 uppercase">Live</span>
              </div>
              <span className="text-xs text-gray-400">
                Lat: {(busLocation.lat ?? busLocation.latitude)?.toFixed(5)},
                Lng: {(busLocation.lng ?? busLocation.longitude)?.toFixed(5)}
              </span>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}

export default LiveTracking
