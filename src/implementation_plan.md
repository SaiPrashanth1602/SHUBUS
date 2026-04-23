# SHUBUS Shuttle Booking System — Major Improvement Plan

Comprehensive overhaul of the React + Firebase shuttle bus booking system to fix critical bugs, add time-aware logic, improve UI clarity, and introduce AI-driven insights.

---

## User Review Required

> [!IMPORTANT]
> This is a large-scale improvement touching **every layer** of the application. The work is organized into 7 phases that can be executed sequentially. Each phase builds on the previous, but they're also somewhat independent.

> [!WARNING]
> **Firebase Security Rules**: The current codebase does NOT have Firestore security rules files in the workspace. Several improvements (server timestamp validation, booking cutoff enforcement) should ideally have server-side rules. This plan implements all logic client-side with Firestore transactions, but for production you should also deploy matching security rules.

> [!CAUTION]
> **Breaking Changes**: The booking status will change from a hardcoded `"confirmed"` string to a dynamically derived state. The cancellation flow will change from deletion to soft-delete (setting `status: "cancelled"`). Old bookings with `status: "confirmed"` will still work since the new logic derives the display status from time + claimed state.

---

## Open Questions

1. **Server Time Source**: Since there's no custom backend (only Firebase), should we use `serverTimestamp()` comparisons or a Firestore Cloud Function for authoritative time? The plan uses Firestore `serverTimestamp()` for writes and client-side `Date.now()` with a server time offset for reads (fetched once on app load). Is that acceptable, or do you want a Cloud Function?

2. **Booking Archive**: When archiving past bookings, should they move to a separate `bookings_archive` collection, or just get a `{ archived: true }` flag on the existing document?

3. **AI Insights Data Source**: The AI insights panel will compute analytics from the existing `bookings` collection. For the last-7-days demand prediction, should it query all bookings from the past 7 days on every admin dashboard load, or should we maintain a pre-aggregated `analytics` collection?

---

## Proposed Changes

### Phase 1: Centralized Booking Status Engine

Create a single source-of-truth module for computing booking status dynamically.

---

#### [NEW] [bookingStatus.js](file:///d:/ONEDRIVE/OneDrive/Desktop/ASDC/services/bookingStatus.js)

Central module exporting:

```js
// Derives display status from booking data + current time
export function getBookingStatus(booking, currentTime) → "BOOKED" | "CANCELLED" | "MISSED" | "CLAIMED" | "EXPIRED"

// Derives shuttle booking window status
export function getBookingWindowStatus(shuttleDepartureTime, currentTime) → "OPEN" | "CLOSING" | "CLOSED"

// Computes time remaining until booking cutoff (10 min before departure)
export function getTimeUntilCutoff(shuttleDepartureTime, currentTime) → { minutes, seconds, totalMs }

// Parses shuttle date + time into a Date object
export function parseDepartureTime(date, time) → Date
```

**Status derivation logic:**
- `CANCELLED` → `booking.status === "cancelled"`
- `CLAIMED` → `booking.claimed === true`
- `MISSED` → `currentTime > departureTime && !booking.claimed`
- `BOOKED` → `currentTime <= departureTime && booking.status !== "cancelled"`
- `EXPIRED` → fallback for very old bookings

**Booking window logic:**
- `OPEN` → cutoff > 10 minutes away
- `CLOSING` → cutoff ≤ 10 minutes away but > 0
- `CLOSED` → cutoff passed (departure time reached)

---

#### [MODIFY] [bookingServices.js](file:///d:/ONEDRIVE/OneDrive/Desktop/ASDC/services/bookingServices.js)

- **`bookSeat()`**: Add time validation — reject if booking window is CLOSED. Change booking doc to include `departureTime` as a server-parseable field.
- **`cancelBooking()`**: Change from DELETE to soft-cancel: set `status: "cancelled"`, remove seat lock, decrement count. Booking doc is preserved for history.
- Add **`getServerTimeOffset()`**: One-time function that writes a temp doc with `serverTimestamp()`, reads it back, and computes `serverTime - clientTime` offset. Used throughout the app.
- Add **`archiveOldBookings()`**: Batch update bookings older than 7 days with `{ archived: true }`.
- Add **`clearExpiredSeatLocks()`**: Remove seat docs from shuttles where the shuttle's departure has passed.

---

#### [MODIFY] [StudentBooking.jsx](file:///d:/ONEDRIVE/OneDrive/Desktop/ASDC/student/StudentBooking.jsx)

- Replace the local `isTicketExpired()` with the centralized `getBookingStatus()`.
- Show status badges: **BOOKED** (green), **CLAIMED** (purple), **CANCELLED** (gray), **MISSED** (red).
- Add countdown timer showing "Booking closes in MM:SS" for active bookings.
- Hide "Cancel Booking" button when status is MISSED or CANCELLED.

---

#### [MODIFY] [ViewBookings.jsx](file:///d:/ONEDRIVE/OneDrive/Desktop/ASDC/admin/ViewBookings.jsx)

- Replace hardcoded status styling with `getBookingStatus()`.
- Add MISSED status badge (red).
- Show derived status instead of raw `booking.status` field.

---

### Phase 2: Time Logic Enforcement & Countdown

---

#### [NEW] [useServerTime.js](file:///d:/ONEDRIVE/OneDrive/Desktop/ASDC/services/useServerTime.js)

Custom React hook:
```js
export function useServerTime() → { serverTime: Date, isLoaded: boolean }
```
- On mount, computes server-client time offset using a single Firestore round-trip.
- Returns a continuously updating `serverTime` (via `setInterval` every second).
- Used by all components that need time-dependent logic.

---

#### [MODIFY] [SeatLayout.jsx](file:///d:/ONEDRIVE/OneDrive/Desktop/ASDC/student/SeatLayout.jsx)

- Import `useServerTime` and `getBookingWindowStatus`.
- Show booking window status badge at the top: OPEN (green), CLOSING (yellow), CLOSED (red).
- Show countdown: "Booking closes in MM:SS".
- **Block the Confirm button** when status is CLOSED.
- Gray out the entire seat grid when CLOSED.

---

#### [MODIFY] [StudentDashboard.jsx](file:///d:/ONEDRIVE/OneDrive/Desktop/ASDC/student/StudentDashboard.jsx)

- For each shuttle card, show booking window status badge.
- Disable "Select Seat" button when CLOSED.
- Show departure countdown on each card.

---

#### [MODIFY] [AdminDashboard.jsx](file:///d:/ONEDRIVE/OneDrive/Desktop/ASDC/admin/AdminDashboard.jsx)

- Add a live server clock display in the header area.
- For each shuttle in the table, show booking window status badge (OPEN/CLOSING/CLOSED).
- Add countdown column to the shuttle table.

---

### Phase 3: GPS Connection Bug Fix

---

#### [MODIFY] [SeatClaim.jsx](file:///d:/ONEDRIVE/OneDrive/Desktop/ASDC/student/SeatClaim.jsx)

Current bug: Shows "Live Bus GPS Connected" when `busLocation` is truthy, but this only means Firebase RTDB returned data — it says nothing about the student's browser GPS permission.

**Fix — Add three-state GPS indicator:**

```
State 1: "Checking GPS Permission..." (loading spinner) — on mount
State 2: "GPS Connected ✅" — browser geolocation permission granted AND coordinates fetched
State 3: "GPS Not Available ❌" — permission denied or error
```

**Implementation:**
- On mount, call `navigator.permissions.query({ name: 'geolocation' })` to check permission state.
- If `granted` → attempt `getCurrentPosition()` to verify it actually works.
- If `denied` → immediately show error state.
- If `prompt` → show "GPS permission required" with explanation.

Also split the bus GPS indicator vs student GPS indicator into two separate status lines:
- **Bus GPS**: Shows bus location from Firebase RTDB (existing logic, keep as-is).
- **Your GPS**: Shows student's browser geolocation status (new logic).

---

#### [MODIFY] [gpsService.js](file:///d:/ONEDRIVE/OneDrive/Desktop/ASDC/services/gpsService.js)

- Add **`checkStudentGPS()`**: Returns `{ status: "loading" | "connected" | "denied" | "unavailable", coords?: {lat, lng}, error?: string }`.
- Add **`getStudentPosition()`**: Promise-based wrapper around `getCurrentPosition()` with proper error handling.

---

### Phase 4: Seat Booking Integrity (Lock Expiry)

---

#### [MODIFY] [bookingServices.js](file:///d:/ONEDRIVE/OneDrive/Desktop/ASDC/services/bookingServices.js)

The existing `bookSeat()` already uses transactions (good). Enhancements:

- **Seat lock expiry**: When writing a seat doc, include `lockedUntil: Timestamp` (5 minutes from now). If a seat doc exists but `lockedUntil` has passed, treat it as available (allow overwrite in transaction).
- **Booking cutoff enforcement**: Inside the transaction, compute departure time and reject if within 10 minutes.

---

#### [MODIFY] [SeatLayout.jsx](file:///d:/ONEDRIVE/OneDrive/Desktop/ASDC/student/SeatLayout.jsx)

- When a seat is clicked and the user hasn't confirmed within 5 minutes, auto-deselect and show a toast.
- Show a "Seat held for X:XX" timer next to the selected seat.

---

### Phase 5: Admin Demand Detection

---

#### [MODIFY] [AdminDashboard.jsx](file:///d:/ONEDRIVE/OneDrive/Desktop/ASDC/admin/AdminDashboard.jsx)

Add demand indicators to the shuttle table:

- **Per-shuttle demand badge**:
  - `< 80%` filled → Normal (no badge)
  - `≥ 80%` filled → **HIGH DEMAND** (orange badge)
  - `100%` filled → **FULL** (red badge)

- **When FULL**: Show an alert banner: "⚠️ All seats filled on [Route] at [Time]. Consider adding another bus."

- Add a new **Demand Overview** metrics card in the overview grid showing:
  - Total demand percentage across all shuttles
  - Number of full shuttles
  - Number of high-demand shuttles

---

### Phase 6: System Maintenance Panel

---

#### [NEW] [SystemMaintenance.jsx](file:///d:/ONEDRIVE/OneDrive/Desktop/ASDC/admin/SystemMaintenance.jsx)

New admin page with three sections:

**1. Clear Expired Seat Locks**
- Button: "Clean Up Locks"
- Scans all shuttles, finds seat docs with `lockedUntil < now`, deletes them.
- Shows count of cleaned locks.

**2. Archive Past Bookings**
- Button: "Archive Bookings"
- Sets `{ archived: true, archivedAt: serverTimestamp() }` on bookings older than 7 days.
- Shows count of archived bookings.

**3. Hard Reset**
- Button: "⚠️ Hard Reset" (red, prominent warning)
- Protected with a **double confirmation** modal: "Type RESET to confirm".
- Deletes all seat locks, resets all shuttle `bookedSeats` to 0.
- Does NOT delete booking history.

---

#### [MODIFY] [AppRouter.jsx](file:///d:/ONEDRIVE/OneDrive/Desktop/ASDC/app/AppRouter.jsx)

- Add route: `/admin/maintenance` → `<SystemMaintenance />`

---

#### [MODIFY] [NavBar.jsx](file:///d:/ONEDRIVE/OneDrive/Desktop/ASDC/components/layout/NavBar.jsx)

- Add "Maintenance" link to admin nav items.

---

### Phase 7: AI Insights Panel

---

#### [NEW] [aiInsights.js](file:///d:/ONEDRIVE/OneDrive/Desktop/ASDC/services/aiInsights.js)

Analytics computation module:

```js
// Input: array of bookings from the last 7 days + current shuttle data
export function computeInsights(bookings, shuttles) → {
  demandPrediction: { byTimeSlot: { [time]: avgBookings } },
  peakDetection: { peakSlot: string, peakAvg: number },
  anomalyDetection: { anomalies: [{ date, timeSlot, type: "spike"|"drop", deviation }] },
  smartSuggestions: [{ action: string, reason: string, suggestedTime: string }]
}
```

**Demand Prediction**: Group bookings by time slot, compute 7-day rolling average.

**Peak Detection**: Find the time slot with the highest average occupancy.

**Anomaly Detection**: Compare each day's bookings per slot against the 7-day average. Flag if deviation > 2 standard deviations.

**Smart Suggestions**: If any shuttle is 100% full, suggest a new bus at the same or adjacent time slot. Use demand data to pick the optimal time.

---

#### [NEW] [AIInsightsPanel.jsx](file:///d:/ONEDRIVE/OneDrive/Desktop/ASDC/admin/AIInsightsPanel.jsx)

New admin page with a dashboard-style layout:

**Section 1: Demand Forecast** — Bar chart (CSS-only, no external charting lib) showing avg bookings per time slot.

**Section 2: Peak Hours** — Highlight card showing the busiest time slot with stats.

**Section 3: Anomaly Alerts** — List of detected anomalies with date, slot, type (spike/drop), and severity.

**Section 4: Smart Suggestions** — Action cards with recommendations:
- "Add a bus at 1:20 PM on VELACHERY route — demand exceeds capacity by 12%"
- Each card has a structured JSON output section showing the AI prompt format.

---

#### [MODIFY] [AppRouter.jsx](file:///d:/ONEDRIVE/OneDrive/Desktop/ASDC/app/AppRouter.jsx)

- Add route: `/admin/ai-insights` → `<AIInsightsPanel />`

---

#### [MODIFY] [NavBar.jsx](file:///d:/ONEDRIVE/OneDrive/Desktop/ASDC/components/layout/NavBar.jsx)

- Add "AI Insights" link to admin nav items.

---

## Summary of All File Changes

| File | Action | Phase |
|------|--------|-------|
| `services/bookingStatus.js` | **NEW** | 1 |
| `services/useServerTime.js` | **NEW** | 2 |
| `services/aiInsights.js` | **NEW** | 7 |
| `admin/SystemMaintenance.jsx` | **NEW** | 6 |
| `admin/AIInsightsPanel.jsx` | **NEW** | 7 |
| `services/bookingServices.js` | MODIFY | 1, 4 |
| `services/gpsService.js` | MODIFY | 3 |
| `student/StudentBooking.jsx` | MODIFY | 1 |
| `student/SeatLayout.jsx` | MODIFY | 2, 4 |
| `student/SeatClaim.jsx` | MODIFY | 3 |
| `student/StudentDashboard.jsx` | MODIFY | 2 |
| `admin/AdminDashboard.jsx` | MODIFY | 2, 5 |
| `admin/ViewBookings.jsx` | MODIFY | 1 |
| `app/AppRouter.jsx` | MODIFY | 6, 7 |
| `components/layout/NavBar.jsx` | MODIFY | 6, 7 |

---

## Verification Plan

### Automated Tests
- After each phase, run the dev server and verify no console errors.
- Test booking flow end-to-end in the browser.

### Manual Verification
1. **Phase 1**: Create a booking → verify status shows BOOKED → wait for departure time to pass → verify status shows MISSED → cancel a booking → verify status shows CANCELLED.
2. **Phase 2**: Verify countdown timer counts down in real-time → verify booking button disables at cutoff → verify admin dashboard shows live clock.
3. **Phase 3**: Test with GPS permission granted → verify "GPS Connected". Test with permission denied → verify "GPS Not Available".
4. **Phase 4**: Open two browser tabs → book same seat simultaneously → verify one succeeds and one fails.
5. **Phase 5**: Fill 80%+ seats → verify HIGH DEMAND badge. Fill 100% → verify FULL badge with suggestion banner.
6. **Phase 6**: Navigate to maintenance page → test each button → verify data changes in Firebase Console.
7. **Phase 7**: Navigate to AI Insights → verify charts and suggestions render with real data.
