import { useEffect, useState } from "react"
import PageWrapper from "../components/layout/PageWrapper"
import { getRecentBookings } from "../services/bookingServices"
import { subscribeShuttlesByDate } from "../services/shuttleServices"
import { computeInsights, generateAIPrompt } from "../services/aiInsights"
import { useServerTime } from "../services/useServerTime"
import { Brain, TrendingUp, AlertTriangle, Lightbulb, BarChart3, ArrowUp } from "lucide-react"

// Smart date helper
const getActiveDate = () => {
  const now = new Date()
  if (now.getHours() >= 15) {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split("T")[0]
  }
  return now.toISOString().split("T")[0]
}


function AIInsightsPanel() {
  const [insights, setInsights] = useState(null)
  const [aiPrompt, setAiPrompt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [shuttles, setShuttles] = useState([])
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const { serverTime, isLoaded: timeLoaded } = useServerTime()

  const activeDate = getActiveDate()

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    const unsub = subscribeShuttlesByDate(activeDate, (data) => {
      setShuttles(data)
    })
    return () => unsub()
  }, [activeDate])

  useEffect(() => {
    const loadInsights = async () => {
      try {
        const bookings = await getRecentBookings(7)
        const computed = computeInsights(bookings, shuttles)
        setInsights(computed)

        if (timeLoaded) {
          const prompt = generateAIPrompt(serverTime, shuttles, computed.demandBySlot)
          setAiPrompt(prompt)
        }
      } catch (err) {
        console.error("Failed to compute insights:", err)
      } finally {
        setLoading(false)
      }
    }

    if (shuttles.length > 0 || !loading) {
      loadInsights()
    }
  }, [shuttles, timeLoaded])

  if (loading) {
    return (
      <PageWrapper role="admin">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium animate-pulse">Computing insights...</p>
        </div>
      </PageWrapper>
    )
  }

  const { demandBySlot, demandByRoute, peakDetection, anomalies, suggestions, dailyTrend } = insights || {}

  // Find max bar value for CSS chart scaling
  const maxDemand = dailyTrend
    ? Math.max(...dailyTrend.map(d => d.count), 1)
    : 1

  const maxSlotDemand = demandBySlot
    ? Math.max(...Object.values(demandBySlot).map(d => d.avgBookings), 1)
    : 1

  return (
    <PageWrapper role="admin">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Brain size={28} className="text-purple-600" />
            AI Insights
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Analytics from the last 7 days of booking data
          </p>
        </div>

        <button
          onClick={() => setShowPrompt(!showPrompt)}
          className="bg-purple-100 text-purple-700 px-4 py-2.5 rounded-xl font-bold text-sm border border-purple-200 hover:bg-purple-200 transition"
        >
          {showPrompt ? "Hide" : "View"} AI Prompt
        </button>
      </div>

      {/* AI PROMPT JSON (collapsible) */}
      {showPrompt && aiPrompt && (
        <div className="bg-gray-900 rounded-2xl p-5 mb-8 overflow-x-auto">
          <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3">Structured AI Input</p>
          <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap">
            {JSON.stringify(aiPrompt, null, 2)}
          </pre>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* ─── DEMAND BY TIME SLOT ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-blue-600" />
            <h2 className="font-bold text-gray-800">Demand by Time Slot</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4">Average daily bookings per departure time</p>

          {demandBySlot && Object.keys(demandBySlot).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(demandBySlot)
                .sort((a, b) => b[1].avgBookings - a[1].avgBookings)
                .map(([time, data]) => (
                  <div key={time} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-600 w-12 shrink-0">{time}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${Math.max((data.avgBookings / maxSlotDemand) * 100, 8)}%` }}
                      >
                        <span className="text-[10px] font-bold text-white">{data.avgBookings}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 w-16 text-right">{data.totalBookings} total</span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No booking data available</p>
          )}
        </div>

        {/* ─── PEAK DETECTION ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-green-600" />
            <h2 className="font-bold text-gray-800">Peak Hours</h2>
          </div>

          {peakDetection && peakDetection.peakSlot !== "N/A" ? (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
              <p className="text-xs text-green-600 font-bold uppercase tracking-wider mb-2">Busiest Slot</p>
              <p className="text-4xl font-extrabold text-green-700 mb-1">{peakDetection.peakSlot}</p>
              <p className="text-sm text-green-600 font-semibold">
                Average {peakDetection.peakAvgBookings} bookings/day
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Across {peakDetection.totalSlots} tracked time slot{peakDetection.totalSlots !== 1 ? "s" : ""}
              </p>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Not enough data to detect peaks</p>
          )}

          {/* Route Demand Summary */}
          {demandByRoute && Object.keys(demandByRoute).length > 0 && (
            <div className="mt-5">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-3">By Route</p>
              <div className="space-y-2">
                {Object.entries(demandByRoute)
                  .sort((a, b) => b[1].avgBookings - a[1].avgBookings)
                  .map(([route, data]) => (
                    <div key={route} className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-gray-700">{route}</span>
                      <span className="text-gray-500 font-mono">{data.avgBookings}/day</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── ANOMALY DETECTION ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-orange-500" />
            <h2 className="font-bold text-gray-800">Anomaly Detection</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4">Unusual spikes or drops vs 7-day average</p>

          {anomalies && anomalies.length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {anomalies.map((anomaly, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    anomaly.severity === "high"
                      ? "bg-red-50 border-red-200"
                      : "bg-yellow-50 border-yellow-200"
                  }`}
                >
                  <span className="text-lg mt-0.5">
                    {anomaly.type === "spike" ? "📈" : "📉"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                        anomaly.severity === "high"
                          ? "bg-red-200 text-red-700"
                          : "bg-yellow-200 text-yellow-700"
                      }`}>
                        {anomaly.severity}
                      </span>
                      <span className="text-xs font-bold text-gray-600">{anomaly.date}</span>
                      <span className="text-xs text-gray-400">at {anomaly.timeSlot}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {anomaly.type === "spike" ? "Spike" : "Drop"}: {anomaly.actual} bookings (expected ~{anomaly.expected})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-green-50 rounded-lg p-4 border border-green-100 text-center">
              <p className="text-green-600 font-semibold text-sm">✅ No anomalies detected</p>
              <p className="text-green-500 text-xs mt-1">Booking patterns are stable</p>
            </div>
          )}
        </div>

        {/* ─── SMART SUGGESTIONS ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={18} className="text-yellow-500" />
            <h2 className="font-bold text-gray-800">Smart Suggestions</h2>
          </div>

          {suggestions && suggestions.length > 0 ? (
            <div className="space-y-3">
              {suggestions.map((suggestion, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-xl border ${
                    suggestion.priority === "high"
                      ? "bg-red-50 border-red-200"
                      : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      suggestion.priority === "high"
                        ? "bg-red-200 text-red-700"
                        : "bg-blue-200 text-blue-700"
                    }`}>
                      {suggestion.priority}
                    </span>
                    {suggestion.shouldAddBus && (
                      <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">
                        ADD BUS
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 font-medium">{suggestion.reason}</p>
                  {suggestion.suggestedTime && (
                    <p className="text-xs text-gray-500 mt-2 font-mono">
                      Suggested time: <strong>{suggestion.suggestedTime}</strong> on <strong>{suggestion.route}</strong>
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-green-50 rounded-lg p-4 border border-green-100 text-center">
              <p className="text-green-600 font-semibold text-sm">👍 All capacity levels healthy</p>
              <p className="text-green-500 text-xs mt-1">No immediate action needed</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── DAILY TREND CHART ─── */}
      {dailyTrend && dailyTrend.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-indigo-600" />
            <h2 className="font-bold text-gray-800">Daily Booking Trend</h2>
          </div>
          <p className="text-xs text-gray-400 mb-6">Total bookings per day (last 7 days)</p>

          <div className="flex items-end gap-2 h-40">
            {dailyTrend.map((day, i) => {
              const height = Math.max((day.count / maxDemand) * 100, 5)
              const isToday = day.date === getActiveDate()

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-gray-600">{day.count}</span>
                  <div
                    className={`w-full rounded-t-lg transition-all duration-500 ${
                      isToday
                        ? "bg-gradient-to-t from-indigo-600 to-indigo-400"
                        : "bg-gradient-to-t from-blue-300 to-blue-200"
                    }`}
                    style={{ height: `${height}%` }}
                  ></div>
                  <span className="text-[9px] text-gray-400 font-mono mt-1">
                    {day.date.slice(5)} {/* MM-DD */}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* BACK TO TOP */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-8 right-8 bg-purple-600 text-white p-4 rounded-2xl shadow-2xl hover:bg-purple-700 transition-all z-[60]"
        >
          <ArrowUp size={24} />
        </button>
      )}
    </PageWrapper>
  )
}

export default AIInsightsPanel
