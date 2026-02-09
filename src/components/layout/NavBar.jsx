import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react"; // npm install lucide-react or use any icon lib
import vitLogo from "../../assets/vit-logo.png";

function NavBar({ role }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = role === "admin" 
    ? [
        { label: "Dashboard", path: "/admin" },
        { label: "Buses", path: "/admin/buses" },
        { label: "Bookings", path: "/admin/bookings" },
      ]
    : [
        { label: "My Booking", path: "/student/booking" }
      ];

  const handleNavigate = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <nav className="w-full bg-vitblue text-white px-6 py-3 relative">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        
        {/* Left: Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer z-50"
          onClick={() => handleNavigate(role === "admin" ? "/admin" : "/student")}
        >
          <img src={vitLogo} alt="VIT Logo" className="h-8" />
          <span className="font-bold text-lg">SHUBUS</span>
        </div>

        {/* Center: Desktop Links (Hidden on mobile) */}
        <div className="hidden md:flex gap-6 text-sm font-medium">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="hover:text-gray-200 transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Right: Logout & Mobile Toggle */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="hidden md:block bg-white text-vitblue px-4 py-1 rounded-md font-semibold hover:bg-gray-100 transition-all"
          >
            Logout
          </button>

          {/* Hamburger Icon */}
          <button className="md:hidden p-1" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full bg-vitblue border-t border-blue-400 md:hidden flex flex-col p-4 gap-4 z-40 shadow-xl">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              className="text-left py-2 text-lg font-medium border-b border-blue-800"
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => handleNavigate("/")}
            className="text-left py-2 text-lg font-bold text-red-200"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}

export default NavBar;