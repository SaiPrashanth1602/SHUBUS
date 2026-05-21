import { useEffect } from "react"

function Toast({ show, message, type = "success", onClose }) {
  useEffect(() => {
    if (!show) return
    const timer = setTimeout(() => {
      onClose()
    }, 2500)
    return () => clearTimeout(timer)
  }, [show, onClose])

  if (!show) return null

  const bg =
    type === "success"
      ? "bg-green-600"
      : type === "danger"
      ? "bg-red-600"
      : "bg-gray-800"

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slideIn">
      <div className={`${bg} text-white px-6 py-3 rounded-xl shadow-xl font-semibold`}>
        {message}
      </div>
    </div>
  )
}

export default Toast
