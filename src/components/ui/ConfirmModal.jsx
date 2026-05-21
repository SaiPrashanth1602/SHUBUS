import { useEffect } from "react"

function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  type = "default" // default | danger | success
}) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onCancel()
    }
    if (open) window.addEventListener("keydown", handleEsc)
    return () => window.removeEventListener("keydown", handleEsc)
  }, [open, onCancel])

  if (!open) return null

  const buttonColor =
    type === "danger"
      ? "bg-red-600 hover:bg-red-700"
      : type === "success"
      ? "bg-green-600 hover:bg-green-700"
      : "bg-vitblue hover:bg-blue-700"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-[90%] max-w-md rounded-2xl shadow-2xl p-6 transform animate-scaleIn">

        <h2 className="text-lg font-bold text-gray-800 mb-2">
          {title}
        </h2>

        <p className="text-gray-600 text-sm mb-6">
          {message}
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold"
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-white font-semibold ${buttonColor}`}
          >
            {confirmText}
          </button>
        </div>

      </div>
    </div>
  )
}

export default ConfirmModal
