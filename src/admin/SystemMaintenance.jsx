import { useState } from "react"
import PageWrapper from "../components/layout/PageWrapper"
import {
  clearExpiredSeatLocks,
  archivePastBookings,
  hardResetSystem,
} from "../services/bookingServices"
import { Wrench, Trash2, Archive, AlertTriangle, ShieldAlert, CheckCircle } from "lucide-react"

function SystemMaintenance() {
  const [lockResult, setLockResult] = useState(null)
  const [archiveResult, setArchiveResult] = useState(null)
  const [resetConfirm, setResetConfirm] = useState("")
  const [showResetModal, setShowResetModal] = useState(false)
  const [loadingLocks, setLoadingLocks] = useState(false)
  const [loadingArchive, setLoadingArchive] = useState(false)
  const [loadingReset, setLoadingReset] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  // ── CLEAR EXPIRED LOCKS ──
  const handleClearLocks = async () => {
    setLoadingLocks(true)
    setLockResult(null)
    try {
      const cleaned = await clearExpiredSeatLocks()
      setLockResult({ success: true, count: cleaned })
    } catch (err) {
      setLockResult({ success: false, error: err.message })
    } finally {
      setLoadingLocks(false)
    }
  }

  // ── ARCHIVE OLD BOOKINGS ──
  const handleArchive = async () => {
    setLoadingArchive(true)
    setArchiveResult(null)
    try {
      const archived = await archivePastBookings(7)
      setArchiveResult({ success: true, count: archived })
    } catch (err) {
      setArchiveResult({ success: false, error: err.message })
    } finally {
      setLoadingArchive(false)
    }
  }

  // ── HARD RESET ──
  const handleReset = async () => {
    if (resetConfirm !== "RESET") return
    setLoadingReset(true)
    try {
      await hardResetSystem()
      setResetDone(true)
      setShowResetModal(false)
      setResetConfirm("")
    } catch (err) {
      alert("Reset failed: " + err.message)
    } finally {
      setLoadingReset(false)
    }
  }


  return (
    <PageWrapper role="admin">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
          <Wrench size={28} className="text-gray-600" />
          System Maintenance
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Safe tools for system cleanup and recovery. All operations preserve booking history.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">

        {/* ─── CLEAR EXPIRED LOCKS ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Trash2 size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">Clear Expired Locks</h2>
              <p className="text-xs text-gray-400">Remove stale seat reservations</p>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-4 flex-1">
            Removes seat lock documents where the 5-minute hold period has expired. This frees up seats that were selected but never confirmed.
          </p>

          {lockResult && (
            <div className={`mb-4 px-3 py-2 rounded-lg text-sm font-semibold ${
              lockResult.success
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-600 border border-red-200"
            }`}>
              {lockResult.success
                ? (
                  <span className="flex items-center gap-1.5">
                    <CheckCircle size={14} />
                    {lockResult.count} expired lock{lockResult.count !== 1 ? "s" : ""} cleaned
                  </span>
                )
                : `Error: ${lockResult.error}`
              }
            </div>
          )}

          <button
            onClick={handleClearLocks}
            disabled={loadingLocks}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingLocks ? "Cleaning..." : "Clean Up Locks"}
          </button>
        </div>

        {/* ─── ARCHIVE PAST BOOKINGS ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <Archive size={20} className="text-amber-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">Archive Bookings</h2>
              <p className="text-xs text-gray-400">Mark old records as archived</p>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-4 flex-1">
            Marks bookings older than 7 days as archived. They remain in the database for records but won't appear in active views. <strong>No data is deleted.</strong>
          </p>

          {archiveResult && (
            <div className={`mb-4 px-3 py-2 rounded-lg text-sm font-semibold ${
              archiveResult.success
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-600 border border-red-200"
            }`}>
              {archiveResult.success
                ? (
                  <span className="flex items-center gap-1.5">
                    <CheckCircle size={14} />
                    {archiveResult.count} booking{archiveResult.count !== 1 ? "s" : ""} archived
                  </span>
                )
                : `Error: ${archiveResult.error}`
              }
            </div>
          )}

          <button
            onClick={handleArchive}
            disabled={loadingArchive}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingArchive ? "Archiving..." : "Archive Bookings"}
          </button>
        </div>

        {/* ─── HARD RESET ─── */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-red-100 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <ShieldAlert size={20} className="text-red-600" />
            </div>
            <div>
              <h2 className="font-bold text-red-700">Hard Reset</h2>
              <p className="text-xs text-red-400">Nuclear option — use with extreme caution</p>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-4 flex-1">
            Deletes <strong>all seat locks</strong> and resets <strong>all shuttle booked counts</strong> to zero. Booking history is preserved. This is intended for system recovery only.
          </p>

          {resetDone && (
            <div className="mb-4 px-3 py-2 rounded-lg text-sm font-semibold bg-green-50 text-green-700 border border-green-200">
              <span className="flex items-center gap-1.5">
                <CheckCircle size={14} />
                System reset complete. All seats are now available.
              </span>
            </div>
          )}

          <button
            onClick={() => {
              setShowResetModal(true)
              setResetDone(false)
            }}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all bg-red-600 text-white hover:bg-red-700"
          >
            ⚠️ Hard Reset
          </button>
        </div>
      </div>

      {/* ─── HARD RESET CONFIRMATION MODAL ─── */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-red-700">Confirm Hard Reset</h2>
                <p className="text-xs text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-red-700 font-medium mb-2">This will:</p>
              <ul className="text-xs text-red-600 space-y-1 list-disc pl-4">
                <li>Delete all seat lock documents from every shuttle</li>
                <li>Reset all shuttle booked counts to 0</li>
                <li>Make all seats show as available immediately</li>
              </ul>
              <p className="text-xs text-green-600 font-bold mt-2">✅ Booking history will NOT be deleted.</p>
            </div>

            <div className="mb-4">
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                Type RESET to confirm
              </label>
              <input
                type="text"
                value={resetConfirm}
                onChange={(e) => setResetConfirm(e.target.value.toUpperCase())}
                placeholder="Type RESET"
                className="w-full p-3 border-2 border-red-200 rounded-xl outline-none focus:border-red-400 font-mono font-bold text-center text-lg tracking-widest"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowResetModal(false)
                  setResetConfirm("")
                }}
                className="flex-1 py-3 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetConfirm !== "RESET" || loadingReset}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                  resetConfirm === "RESET"
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                {loadingReset ? "Resetting..." : "Confirm Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}

export default SystemMaintenance
