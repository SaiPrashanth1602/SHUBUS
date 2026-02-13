import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Menu, X } from "lucide-react" 
import { signOut } from "firebase/auth" // ✅ Import SignOut
import { auth } from "../../config/firebase" // ✅ Import Auth
import vitLogo from "../../assets/vit-logo.png"

function NavBar({ role }) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)

  // 1. Define Links based on Role
  const navItems = role === "admin" 
    ? [
        { label: "Dashboard", path: "/admin" },
        { label: "Manage Buses", path: "/admin/buses" }, // Added useful link
        { label: "Manage Shuttles", path: "/admin/add-shuttle" },
        { label: "Bookings", path: "/admin/bookings" },
      ]
    : [
        { label: "Book a Seat", path: "/student" }, // ✅ Added Dashboard Link
        { label: "My Bookings", path: "/student/my-bookings" } // ✅ FIXED: Points to permanent page
      ]

  // 2. Handle Navigation
  const handleNavigate = (path) => {
    navigate(path)
    setIsOpen(false)
  }

  // 3. Handle Logout (Actually disconnects from Firebase)
  const handleLogout = async () => {
    try {
        await signOut(auth) // Tell Firebase to kill session
        navigate("/") // Go to login
    } catch (error) {
        console.error("Logout Error:", error)
    }
  }

  return (
    <nav className="w-full bg-vitblue text-white px-6 py-3 relative shadow-md z-50">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        
        {/* Left: Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={() => handleNavigate(role === "admin" ? "/admin" : "/student")}
        >
          <img src={vitLogo} alt="VIT Logo" className="h-8 md:h-10 transition-all" />
          <span className="font-bold text-xl tracking-tight">SHUBUS</span>
        </div>

        {/* Center: Desktop Links (Hidden on mobile) */}
        <div className="hidden md:flex gap-8 text-sm font-semibold">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="hover:text-blue-200 transition-colors uppercase tracking-wide text-xs"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Right: Logout & Mobile Toggle */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleLogout}
            className="hidden md:block bg-white/10 border border-white/20 text-white px-5 py-1.5 rounded-full text-sm font-bold hover:bg-white hover:text-vitblue transition-all"
          >
            Logout
          </button>

          {/* Hamburger Icon */}
          <button className="md:hidden p-1 text-white" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full bg-vitblue border-t border-blue-800 md:hidden flex flex-col p-4 gap-2 shadow-2xl animate-in slide-in-from-top-2">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              className="text-left py-3 px-4 text-lg font-medium hover:bg-blue-800 rounded-lg transition-colors"
            >
              {item.label}
            </button>
          ))}
          <div className="h-px bg-blue-800 my-2"></div>
          <button
            onClick={handleLogout}
            className="text-left py-3 px-4 text-lg font-bold text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  )
}

export default NavBar