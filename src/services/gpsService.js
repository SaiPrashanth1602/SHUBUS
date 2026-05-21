/**
 * ─────────────────────────────────────────────────────────────
 * GPS SERVICE — Bus + Student Location
 * ─────────────────────────────────────────────────────────────
 * 
 * Two separate concerns:
 * 1. Bus GPS — Firebase RTDB listener (bus hardware)
 * 2. Student GPS — Browser Geolocation API
 * 
 * RULE: Never show "Connected" unless real coordinates exist.
 * ─────────────────────────────────────────────────────────────
 */

import { ref, onValue } from "firebase/database";
import { rtdb } from "../config/firebase";


// ─────────────────────────────────────────────────────────────
// 1. BUS GPS — Listen to Firebase RTDB
// ─────────────────────────────────────────────────────────────
export const listenToBusLocation = (busId, callback) => {
  console.log("🔥 Listening to:", `buses/${busId}`);

  const busRef = ref(rtdb, `buses/${busId}`);

  return onValue(busRef, (snapshot) => {
    const data = snapshot.val();

    console.log("🔥 Firebase Snapshot:", data);

    if (data) {
      callback(data);
    }
  });
};


// ─────────────────────────────────────────────────────────────
// 2. STUDENT GPS — Check Permission + Get Coordinates
// ─────────────────────────────────────────────────────────────

// GPS Status constants
export const GPS_STATUS = {
  LOADING: "loading",
  CONNECTED: "connected",
  DENIED: "denied",
  UNAVAILABLE: "unavailable",
  ERROR: "error",
};

/**
 * Check the current geolocation permission state.
 * Returns: "granted" | "denied" | "prompt" | "unavailable"
 */
export async function checkGPSPermission() {
  // Check if geolocation is available
  if (!navigator.geolocation) {
    return "unavailable"
  }

  // Use Permissions API if available
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const result = await navigator.permissions.query({ name: "geolocation" })
      return result.state // "granted" | "denied" | "prompt"
    } catch (err) {
      // Some browsers don't support querying geolocation permission
      return "prompt"
    }
  }

  // Fallback: assume prompt
  return "prompt"
}


/**
 * Attempt to get the student's current position.
 * Returns: { status, coords?, error? }
 * 
 * status: GPS_STATUS value
 * coords: { latitude, longitude } if successful
 * error: error message string if failed
 */
export function getStudentPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        status: GPS_STATUS.UNAVAILABLE,
        coords: null,
        error: "Geolocation is not supported on this device",
      })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          status: GPS_STATUS.CONNECTED,
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          error: null,
        })
      },
      (error) => {
        let status = GPS_STATUS.ERROR
        let message = "Unknown GPS error"

        switch (error.code) {
          case error.PERMISSION_DENIED:
            status = GPS_STATUS.DENIED
            message = "GPS permission denied. Please allow location access."
            break
          case error.POSITION_UNAVAILABLE:
            status = GPS_STATUS.UNAVAILABLE
            message = "GPS position unavailable. Check your device settings."
            break
          case error.TIMEOUT:
            status = GPS_STATUS.ERROR
            message = "GPS request timed out. Please try again."
            break
          default:
            message = error.message || "Could not get your location"
        }

        resolve({
          status,
          coords: null,
          error: message,
        })
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  })
}