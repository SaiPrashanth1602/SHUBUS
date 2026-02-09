import { useNavigate } from "react-router-dom"
import vitLogo from "../../assets/vit-logo.png"

function NavBar({ role }) {
  const navigate = useNavigate()

  return (
    <div className="w-full bg-vitblue text-white px-6 py-3 flex items-center justify-between">

      {/* Left: Logo */}
      <div
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => navigate(role === "admin" ? "/admin" : "/student")}
      >
        <img src={vitLogo} alt="VIT Logo" className="h-8" />
        <span className="font-bold text-lg">SHUBUS</span>
      </div>

      {/* Center: Admin Links */}
      {role === "admin" && (
        <div className="flex gap-6 text-sm font-medium">
          <button
            onClick={() => navigate("/admin")}
            className="hover:underline"
          >
            Dashboard
          </button>

          <button
            onClick={() => navigate("/admin/buses")}
            className="hover:underline"
          >
            Buses
          </button>

          <button
            onClick={() => navigate("/admin/bookings")}
            className="hover:underline"
          >
            Bookings
          </button>
        </div>
      )}

      {/* Center: Student Links */}
      {role === "student" && (
        <div className="flex gap-6 text-sm font-medium">
          <button
            onClick={() => navigate("/student/booking")}
            className="hover:underline"
          >
            My Booking
          </button>
        </div>
      )}

      {/* Right: Logout */}
      <button
        onClick={() => navigate("/")}
        className="bg-white text-vitblue px-4 py-1 rounded-md font-semibold hover:bg-gray-100"
      >
        Logout
      </button>
    </div>
  )
}

export default NavBar
