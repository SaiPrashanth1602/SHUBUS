/**
 * ─────────────────────────────────────────────────────────────
 * useServerTime — React Hook for Server-Authoritative Time
 * ─────────────────────────────────────────────────────────────
 * 
 * Problem: Client device clocks are unreliable. Students could
 * change their phone time to bypass booking cutoffs.
 * 
 * Solution: On mount, compute the offset between client time
 * and Firestore server time using a single round-trip. Then
 * apply that offset to all subsequent Date.now() calls.
 * 
 * Usage:
 *   const { serverTime, isLoaded } = useServerTime()
 *   // serverTime updates every second
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef } from "react"
import { db } from "../config/firebase"
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  serverTimestamp,
  collection,
} from "firebase/firestore"

// Singleton: compute offset once per app session
let _cachedOffset = 0
let _offsetResolved = false
let _offsetPromise = null

/**
 * Computes the difference between server time and client time.
 * Uses a temp Firestore doc with serverTimestamp().
 * 
 * offset = serverTime - clientTime
 * So: serverTime ≈ Date.now() + offset
 */
async function computeServerTimeOffset() {
  if (_offsetResolved) return _cachedOffset
  if (_offsetPromise) return _offsetPromise

  _offsetPromise = (async () => {
    try {
      const tempRef = doc(collection(db, "_timeSync"))
      const clientBefore = Date.now()

      // Write server timestamp
      await setDoc(tempRef, { ts: serverTimestamp() })

      // Read it back
      const snap = await getDoc(tempRef)
      const clientAfter = Date.now()

      // Clean up
      await deleteDoc(tempRef).catch(() => {})

      if (snap.exists() && snap.data().ts) {
        const serverMs = snap.data().ts.toMillis()
        // Approximate client time at the moment the server wrote = midpoint of round-trip
        const clientMidpoint = (clientBefore + clientAfter) / 2
        _cachedOffset = serverMs - clientMidpoint
      } else {
        _cachedOffset = 0
      }

      _offsetResolved = true
      return _cachedOffset
    } catch (err) {
      console.warn("⚠️ Could not compute server time offset, using local time:", err.message)
      _cachedOffset = 0
      _offsetResolved = true
      return 0
    }
  })()

  return _offsetPromise
}

/**
 * Get the current server time (non-hook version).
 * Safe to call anywhere.
 */
export function getServerTimeNow() {
  return new Date(Date.now() + _cachedOffset)
}

/**
 * React hook: returns a continuously updating serverTime.
 */
export function useServerTime() {
  const [serverTime, setServerTime] = useState(new Date())
  const [isLoaded, setIsLoaded] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    let mounted = true

    const init = async () => {
      await computeServerTimeOffset()
      if (!mounted) return
      setIsLoaded(true)
      setServerTime(new Date(Date.now() + _cachedOffset))
    }

    init()

    // Tick every second
    intervalRef.current = setInterval(() => {
      if (mounted) {
        setServerTime(new Date(Date.now() + _cachedOffset))
      }
    }, 1000)

    return () => {
      mounted = false
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return { serverTime, isLoaded }
}

export default useServerTime
