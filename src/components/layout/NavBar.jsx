import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Menu, X, CircleUser, Bus, User } from "lucide-react" 
import { signOut, onAuthStateChanged } from "firebase/auth" 
import { doc, getDoc } from "firebase/firestore" 
import { auth, db } from "../../config/firebase" 
import vitLogo from "../../assets/vit-logo.png"

function NavBar({ role }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [userData, setUserData] = useState(null) 

  // Fetch User Data from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid)
        const userDocSnap = await getDoc(userDocRef)
        if (userDocSnap.exists()) {
          setUserData(userDocSnap.data())
        }
      } else {
        setUserData(null)
      }
    })
    return () => unsubscribe()
  }, [])

  // Define Links based on Role
  const navItems = role === "admin" 
    ? [
        { label: "Dashboard", path: "/admin" },
        { label: "Shuttles", path: "/admin/add-shuttle" },
        { label: "Buses", path: "/admin/buses" }, 
        { label: "Bookings", path: "/admin/bookings" },
        { label: "AI Insights", path: "/admin/ai-insights" },
        { label: "Maintenance", path: "/admin/maintenance" },
      ]
    : [
        { label: "Book a Seat", path: "/student" }, 
        { label: "My Bookings", path: "/student/my-bookings" } 
      ]

  const handleNavigate = (path) => {
    navigate(path)
    setIsOpen(false)
  }

  const handleLogout = async () => {
    try {
        await signOut(auth) 
        navigate("/") 
    } catch (error) {
        console.error("Logout Error:", error)
    }
  }

  // ✨ Helper to determine link styling with Glow effect
  const getLinkStyle = (path) => {
    const isActive = location.pathname === path;
    return isActive 
      ? "bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.3)] px-4 py-2 rounded-lg font-bold" 
      : "text-blue-100 hover:text-white hover:bg-white/10 px-4 py-2 rounded-lg";
  }

  // ✨ FIX: Strictly force "Admin" text if the role is admin to prevent Sujan/Student name leak
  const displayName = role === "admin" ? "Admin" : (userData?.name || "User");

  return (
    <nav className="w-full bg-vitblue text-white px-6 py-3 relative shadow-md z-50">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        
        {/* Left: Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={() => handleNavigate(role === "admin" ? "/admin" : "/student")}
        >
          <img src={vitLogo} alt="VIT Logo" className="h-8 md:h-10 transition-all bg-white rounded p-0.5" />
          <span className="font-bold text-xl tracking-tight">SHUBUS</span>
        </div>

        {/* Center: Desktop Links */}
        <div className="hidden md:flex gap-2 text-sm font-semibold items-center">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`${getLinkStyle(item.path)} transition-all duration-300 uppercase tracking-wide text-xs`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Right: Profile & Mobile Toggle */}
        <div className="flex items-center gap-4">
          
          {/* DESKTOP PROFILE DROPDOWN */}
          <div className="relative hidden md:block">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 text-white hover:text-blue-200 transition focus:outline-none"
            >
              <span className="text-sm font-bold">{displayName}</span>
              <CircleUser size={28} strokeWidth={1.5} />
            </button>
            
            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-2 border border-gray-100 text-gray-800 z-50 animate-in slide-in-from-top-2">
                  
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
                    <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
                    {/* Only show RegNo if Student and not in Admin mode */}
                    {role === "student" && userData?.regNo && (
                      <div className="flex items-center gap-1.5 mt-1 text-gray-500">
                        {/* ✅ REMOVED HASH ICON - Using User icon or nothing for cleaner look */}
                        <User size={12} />
                        <p className="text-xs font-semibold">{userData.regNo}</p>
                      </div>
                    )}
                  </div>

                  {role === "student" && userData?.busType && (
                    <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Bus Type</p>
                      <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold text-xs">
                        <Bus size={12} />
                        {userData.busType}
                      </div>
                    </div>
                  )}

                  <div className="px-2 pt-2 pb-1">
                    <button 
                      onClick={() => {
                        setIsProfileOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 font-bold hover:bg-red-50 rounded-lg transition"
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Hamburger Icon */}
          <button className="md:hidden p-1 text-white" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full bg-vitblue border-t border-blue-800 md:hidden flex flex-col shadow-2xl animate-in slide-in-from-top-2 z-50">
          <div className="flex flex-col p-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`text-left py-3 px-4 text-base font-medium rounded-lg transition-colors ${
                    location.pathname === item.path ? "bg-blue-800 text-white font-bold" : "hover:bg-blue-800"
                }`}
              >
                {item.label}
              </button>
            ))}
            <div className="h-px bg-blue-800 my-2 mx-2"></div>
            <button
              onClick={handleLogout}
              className="text-left py-3 px-4 text-base font-bold text-red-300 hover:bg-red-900/40 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}

export default NavBar