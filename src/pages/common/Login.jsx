import { useState } from "react"
import { useNavigate } from "react-router-dom"
import vitLogo from "../../assets/vit-logo.png"
import { db } from "../../firebase/firebase"


function Login() {
  const [role, setRole] = useState("student")
  const [regNo, setRegNo] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const handleLogin = () => {
    setError("")

    if (!regNo || !password) {
      setError("Please fill all fields")
      return
    }

    if (
      role === "student" &&
      regNo === "student" &&
      password === "stud123"
    ) {
      navigate("/student")
      return
    }

    if (
      role === "admin" &&
      regNo === "admin" &&
      password === "admin123"
    ) {
      navigate("/admin")
      return
    }

    setError("Invalid credentials for selected role")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-vitlight">
      <div className="bg-white w-[380px] p-8 rounded-2xl shadow-lg">

        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img src={vitLogo} alt="VIT Logo" className="h-12" />
        </div>

        <h1 className="text-center text-2xl font-bold text-vitblue mb-6">
          SHUBUS Login
        </h1>

        {/* Role Toggle */}
        <div className="flex bg-gray-100 rounded-lg mb-5 p-1">
          <button
            onClick={() => setRole("student")}
            className={`w-1/2 py-2 rounded-md font-semibold transition ${
              role === "student"
                ? "bg-vitblue text-white"
                : "text-gray-600"
            }`}
          >
            Student
          </button>

          <button
            onClick={() => setRole("admin")}
            className={`w-1/2 py-2 rounded-md font-semibold transition ${
              role === "admin"
                ? "bg-vitblue text-white"
                : "text-gray-600"
            }`}
          >
            Admin
          </button>
        </div>

        {/* Register Number */}
        <input
          type="text"
          placeholder="Register Number"
          value={regNo}
          onChange={(e) => setRegNo(e.target.value)}
          className="w-full mb-3 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-vitblue"
        />

        {/* Password */}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-vitblue"
        />

        {/* Error Message */}
        {error && (
          <p className="text-red-500 text-sm mb-3 text-center">
            {error}
          </p>
        )}

        {/* Login Button */}
        <button
          onClick={handleLogin}
          className="w-full bg-vitblue text-white py-3 rounded-lg font-semibold hover:opacity-90 transition"
        >
          Login
        </button>

        <p className="text-xs text-center text-gray-400 mt-4">
          VIT Shuttle Seat Booking System
        </p>
      </div>
    </div>
  )
}

export default Login
