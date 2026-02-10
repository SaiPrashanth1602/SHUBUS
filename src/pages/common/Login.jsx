import { useState } from "react"
import { useNavigate } from "react-router-dom"
import vitLogo from "../../assets/vit-logo.png"
import { auth, db } from "../../config/firebase"
import { signInWithEmailAndPassword } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"

// 👁️ Sujan's Eye Icons (SVG)
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const EyeSlashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
)

function Login() {
  const [role, setRole] = useState("student")
  const [regNo, setRegNo] = useState("") 
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false) // ✨ New State for Toggle
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async () => {
    setError("")
    setLoading(true)

    if (!regNo || !password) {
      setError("Please fill all fields")
      setLoading(false)
      return
    }

    try {
      // 1. CONVERT INPUT TO EMAIL (e.g. 24MIS1063 -> 24MIS1063@shubus.com)
      const emailToTry = regNo.includes("@") ? regNo.toLowerCase() : `${regNo.toLowerCase()}@shubus.com`

      // 2. FIREBASE AUTH
      const userCredential = await signInWithEmailAndPassword(auth, emailToTry, password)
      const user = userCredential.user

      // 3. FETCH USER DATA
      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)

      if (userDoc.exists()) {
        const userData = userDoc.data()

        // 4. ROLE CHECK
        if (userData.role !== role) {
            setError(`Account found, but it is not a ${role} account.`)
            await auth.signOut()
            setLoading(false)
            return
        }

        // 5. SAVE SESSION
        localStorage.setItem("userRole", userData.role)
        localStorage.setItem("userId", user.uid)
        
        if (userData.role === 'student') {
            localStorage.setItem("busType", userData.busType || "Non-AC")
        }

        console.log("Login Success! Redirecting...")
        if (role === "admin") navigate("/admin")
        else navigate("/student")

      } else {
        setError("User profile missing from database.")
        await auth.signOut()
      }

    } catch (err) {
      console.error("Login Error:", err)
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found") {
        setError("Invalid Register Number or Password")
      } else {
        setError("Login failed. Check connection.")
      }
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-vitlight">
      <div className="bg-white w-[380px] p-8 rounded-2xl shadow-lg">
        <div className="flex justify-center mb-4">
          <img src={vitLogo} alt="VIT Logo" className="h-12" />
        </div>

        <h1 className="text-center text-2xl font-bold text-vitblue mb-6">SHUBUS Login</h1>

        {/* Role Toggle Buttons */}
        <div className="flex bg-gray-100 rounded-lg mb-5 p-1">
          <button onClick={() => setRole("student")} className={`w-1/2 py-2 rounded-md font-semibold transition ${role === "student" ? "bg-vitblue text-white" : "text-gray-600"}`}>Student</button>
          <button onClick={() => setRole("admin")} className={`w-1/2 py-2 rounded-md font-semibold transition ${role === "admin" ? "bg-vitblue text-white" : "text-gray-600"}`}>Admin</button>
        </div>

        <input 
          type="text" 
          placeholder={role === "student" ? "Register Number" : "Admin Username"} 
          value={regNo} 
          onChange={(e) => setRegNo(e.target.value)} 
          className="w-full mb-3 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-vitblue"
        />

        {/* ✨ Password Input with Toggle Button */}
        <div className="relative w-full mb-4">
          <input 
            type={showPassword ? "text" : "password"} 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-vitblue pr-10" // Added padding-right so text doesn't hit the icon
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3.5 hover:opacity-70 transition outline-none"
            tabIndex="-1" // Prevents tab key from stopping on the eye icon
          >
            {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
          </button>
        </div>

        {error && <p className="text-red-500 text-sm mb-3 text-center">{error}</p>}

        <button 
          onClick={handleLogin} 
          disabled={loading} 
          className={`w-full text-white py-3 rounded-lg font-semibold transition ${loading ? "bg-gray-400" : "bg-vitblue hover:opacity-90"}`}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="text-xs text-center text-gray-400 mt-4">VIT Shuttle Seat Booking System</p>
      </div>
    </div>
  )
}

export default Login