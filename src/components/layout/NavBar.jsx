import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Menu, X, CircleUser, Bus, Hash } from "lucide-react" 
import { signOut, onAuthStateChanged } from "firebase/auth" 
import { doc, getDoc } from "firebase/firestore" 
import { auth, db } from "../../config/firebase" 
import vitLogo from "../../assets/vit-logo.png"

function NavBar({ role }) {
  const navigate = useNavigate()
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

  // 1. Define Links based on Role
  const navItems = role === "admin" 
    ? [
        { label: "Dashboard", path: "/admin" },
        { label: "Manage Shuttles", path: "/admin/add-shuttle" },
        { label: "Manage Buses", path: "/admin/buses" }, 
        { label: "Bookings", path: "/admin/bookings" },
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

        {/* Right: Profile & Mobile Toggle */}
        <div className="flex items-center gap-4">
          
          {/* DESKTOP PROFILE DROPDOWN */}
          {userData && (
            <div className="relative hidden md:block">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center justify-center text-white hover:text-blue-200 transition focus:outline-none"
              >
                <CircleUser size={32} strokeWidth={1.5} />
              </button>
              
              {isProfileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-2 border border-gray-100 text-gray-800 z-50 animate-in slide-in-from-top-2">
                    
                    {/* Top Header Section - Always shows Name */}
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
                      <p className="text-sm font-bold text-gray-900 truncate">{userData.name}</p>
                      
                      {/* Only show RegNo if Student */}
                      {role === "student" && (
                        <div className="flex items-center gap-1.5 mt-1 text-gray-500">
                          <Hash size={12} />
                          <p className="text-xs font-semibold">{userData.regNo}</p>
                        </div>
                      )}
                    </div>

                    {/* Middle Section - Only show Bus Type if Student */}
                    {role === "student" && (
                      <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Bus Type</p>
                        <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold text-xs">
                          <Bus size={12} />
                          {userData.busType}
                        </div>
                      </div>
                    )}

                    {/* Bottom Section - Always shows Logout */}
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
          )}

          {/* Desktop Fallback Logout */}
          {!userData && (
            <button
              onClick={handleLogout}
              className="hidden md:block bg-white/10 border border-white/20 text-white px-5 py-1.5 rounded-full text-sm font-bold hover:bg-white hover:text-vitblue transition-all"
            >
              Logout
            </button>
          )}

          {/* Hamburger Icon */}
          <button className="md:hidden p-1 text-white" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full bg-vitblue border-t border-blue-800 md:hidden flex flex-col shadow-2xl animate-in slide-in-from-top-2 z-50">
          
          {/* Mobile Profile Section */}
          {userData && (
            <div className="p-4 bg-blue-900/30 border-b border-blue-800/50 flex items-center gap-3">
              <CircleUser size={40} strokeWidth={1.5} className="text-blue-200" />
              <div className="min-w-0"> 
                {/* Always show Name */}
                <p className="text-white font-bold truncate">{userData.name}</p>
                
                {/* Only show RegNo and BusType if Student */}
                {role === "student" && (
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-blue-200 text-xs font-mono">{userData.regNo}</p>
                    <span className="text-blue-400/50 text-xs">|</span>
                    <p className="text-blue-200 text-xs font-bold">{userData.busType} Bus</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile Links */}
          <div className="flex flex-col p-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className="text-left py-3 px-4 text-base font-medium hover:bg-blue-800 rounded-lg transition-colors"
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
