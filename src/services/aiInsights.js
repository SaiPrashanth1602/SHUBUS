/**
 * ─────────────────────────────────────────────────────────────
 * AI INSIGHTS ENGINE — Lightweight Analytics
 * ─────────────────────────────────────────────────────────────
 * 
 * No heavy ML. Uses simple statistical analysis:
 * 1. Demand Prediction (rolling average)
 * 2. Peak Detection (highest avg slot)
 * 3. Anomaly Detection (standard deviation)
 * 4. Smart Suggestions (rule-based)
 * 
 * Input: recent bookings + current shuttle data
 * Output: structured insights object
 * ─────────────────────────────────────────────────────────────
 */


/**
 * Main entry: compute all insights from bookings data.
 * 
 * @param {Array} bookings - Booking documents from the last N days
 * @param {Array} shuttles - Current shuttle documents
 * @returns {Object} insights
 */
export function computeInsights(bookings, shuttles) {
  const demandBySlot = computeDemandBySlot(bookings)
  const demandByRoute = computeDemandByRoute(bookings)
  const peakDetection = detectPeaks(demandBySlot)
  const anomalies = detectAnomalies(bookings, demandBySlot)
  const suggestions = generateSuggestions(shuttles, demandBySlot, demandByRoute)
  const dailyTrend = computeDailyTrend(bookings)

  return {
    demandBySlot,
    demandByRoute,
    peakDetection,
    anomalies,
    suggestions,
    dailyTrend,
  }
}


// ─────────────────────────────────────────────────────────────
// 1. DEMAND BY TIME SLOT (avg bookings per slot over N days)
// ─────────────────────────────────────────────────────────────
function computeDemandBySlot(bookings) {
  // Group bookings by time slot
  const slotData = {} // { "1:20": { total: N, days: Set } }

  for (const b of bookings) {
    const time = b.time || "unknown"
    const date = b.date || "unknown"
    
    // Hard-deleted bookings won't appear, no cancelled filter needed

    if (!slotData[time]) {
      slotData[time] = { total: 0, days: new Set() }
    }
    slotData[time].total++
    slotData[time].days.add(date)
  }

  // Compute average per slot
  const result = {}
  for (const [time, data] of Object.entries(slotData)) {
    const numDays = Math.max(data.days.size, 1)
    result[time] = {
      avgBookings: Math.round((data.total / numDays) * 10) / 10,
      totalBookings: data.total,
      uniqueDays: numDays,
    }
  }

  return result
}


// ─────────────────────────────────────────────────────────────
// 2. DEMAND BY ROUTE
// ─────────────────────────────────────────────────────────────
function computeDemandByRoute(bookings) {
  const routeData = {}

  for (const b of bookings) {
    const route = b.route || "unknown"
    // Hard-deleted bookings won't appear, no cancelled filter needed

    if (!routeData[route]) {
      routeData[route] = { total: 0, days: new Set() }
    }
    routeData[route].total++
    routeData[route].days.add(b.date || "unknown")
  }

  const result = {}
  for (const [route, data] of Object.entries(routeData)) {
    const numDays = Math.max(data.days.size, 1)
    result[route] = {
      avgBookings: Math.round((data.total / numDays) * 10) / 10,
      totalBookings: data.total,
    }
  }

  return result
}


// ─────────────────────────────────────────────────────────────
// 3. PEAK DETECTION — Find busiest time slot
// ─────────────────────────────────────────────────────────────
function detectPeaks(demandBySlot) {
  let peakSlot = null
  let peakAvg = 0

  for (const [time, data] of Object.entries(demandBySlot)) {
    if (data.avgBookings > peakAvg) {
      peakAvg = data.avgBookings
      peakSlot = time
    }
  }

  return {
    peakSlot: peakSlot || "N/A",
    peakAvgBookings: peakAvg,
    totalSlots: Object.keys(demandBySlot).length,
  }
}


// ─────────────────────────────────────────────────────────────
// 4. ANOMALY DETECTION — Detect spikes/drops vs 7-day avg
// ─────────────────────────────────────────────────────────────
function detectAnomalies(bookings, demandBySlot) {
  // Group bookings by date+time
  const dailySlots = {} // { "2026-04-20_1:20": count }

  for (const b of bookings) {
    // Hard-deleted bookings won't appear, no cancelled filter needed
    const key = `${b.date}_${b.time}`
    dailySlots[key] = (dailySlots[key] || 0) + 1
  }

  const anomalies = []

  // For each time slot, check each day's count vs the average
  for (const [time, slotInfo] of Object.entries(demandBySlot)) {
    const avg = slotInfo.avgBookings
    if (avg === 0) continue

    // Collect daily counts for this slot
    const dailyCounts = []
    for (const [key, count] of Object.entries(dailySlots)) {
      if (key.endsWith(`_${time}`)) {
        dailyCounts.push({ date: key.split("_")[0], count })
      }
    }

    if (dailyCounts.length < 2) continue

    // Compute standard deviation
    const mean = dailyCounts.reduce((s, d) => s + d.count, 0) / dailyCounts.length
    const variance = dailyCounts.reduce((s, d) => s + (d.count - mean) ** 2, 0) / dailyCounts.length
    const stdDev = Math.sqrt(variance)

    if (stdDev === 0) continue

    // Flag if any day deviates > 1.5 std devs
    for (const { date, count } of dailyCounts) {
      const deviation = (count - mean) / stdDev

      if (Math.abs(deviation) > 1.5) {
        anomalies.push({
          date,
          timeSlot: time,
          actual: count,
          expected: Math.round(mean * 10) / 10,
          type: deviation > 0 ? "spike" : "drop",
          severity: Math.abs(deviation) > 2 ? "high" : "medium",
          deviation: Math.round(deviation * 100) / 100,
        })
      }
    }
  }

  // Sort by severity (high first) then date (newest first)
  anomalies.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "high" ? -1 : 1
    return b.date.localeCompare(a.date)
  })

  return anomalies
}


// ─────────────────────────────────────────────────────────────
// 5. SMART SUGGESTIONS — Rule-based recommendations
// ─────────────────────────────────────────────────────────────
function generateSuggestions(shuttles, demandBySlot, demandByRoute) {
  const suggestions = []

  // Check each current shuttle's fill ratio
  for (const shuttle of shuttles) {
    const total = shuttle.totalSeats || 50
    const booked = shuttle.bookedSeats || 0
    const ratio = booked / total

    if (ratio >= 1) {
      // FULL — suggest adding a bus
      const slotDemand = demandBySlot[shuttle.time]
      const avgDemand = slotDemand ? slotDemand.avgBookings : booked

      suggestions.push({
        type: "add_bus",
        priority: "high",
        route: shuttle.route,
        time: shuttle.time,
        reason: `${shuttle.route} at ${shuttle.time} is 100% full (${booked}/${total}). Average demand: ${avgDemand} bookings/day.`,
        suggestedTime: shuttle.time,
        shouldAddBus: true,
      })
    } else if (ratio >= 0.8) {
      suggestions.push({
        type: "monitor",
        priority: "medium",
        route: shuttle.route,
        time: shuttle.time,
        reason: `${shuttle.route} at ${shuttle.time} is at ${Math.round(ratio * 100)}% capacity (${booked}/${total}). May fill up soon.`,
        shouldAddBus: false,
      })
    }
  }

  // Check if any route has consistently high demand
  for (const [route, data] of Object.entries(demandByRoute)) {
    if (data.avgBookings > 40) {
      // More than 40 avg bookings = close to capacity across buses
      const existingBuses = shuttles.filter(s => s.route === route).length
      suggestions.push({
        type: "route_overload",
        priority: "medium",
        route,
        reason: `${route} averages ${data.avgBookings} bookings/day across ${existingBuses} bus(es). Consider adding more capacity.`,
        shouldAddBus: existingBuses < 3,
      })
    }
  }

  // Sort by priority
  suggestions.sort((a, b) => {
    const prio = { high: 0, medium: 1, low: 2 }
    return (prio[a.priority] || 2) - (prio[b.priority] || 2)
  })

  return suggestions
}


// ─────────────────────────────────────────────────────────────
// 6. DAILY TREND — Bookings per day (for chart)
// ─────────────────────────────────────────────────────────────
function computeDailyTrend(bookings) {
  const dailyCounts = {}

  for (const b of bookings) {
    // Hard-deleted bookings won't appear, no cancelled filter needed
    const date = b.date || "unknown"
    dailyCounts[date] = (dailyCounts[date] || 0) + 1
  }

  // Convert to sorted array
  return Object.entries(dailyCounts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}


// ─────────────────────────────────────────────────────────────
// AI PROMPT GENERATOR — Structured output for LLM integration
// ─────────────────────────────────────────────────────────────
export function generateAIPrompt(serverTime, shuttles, demandBySlot) {
  return {
    currentTime: serverTime?.toISOString() || new Date().toISOString(),
    buses: shuttles.map(s => ({
      time: s.time,
      route: s.route,
      capacity: s.totalSeats || 50,
      bookedSeats: s.bookedSeats || 0,
      fillRate: Math.round(((s.bookedSeats || 0) / (s.totalSeats || 50)) * 100) + "%",
    })),
    avgDemandByTime: demandBySlot,
    recentTrends: "computed_from_last_7_days",
  }
}
