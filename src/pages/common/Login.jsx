import { useState } from "react"
import { useNavigate } from "react-router-dom"
import vitLogo from "../../assets/vit-logo.png"
import { auth, db } from "../../config/firebase"
import { signInWithEmailAndPassword } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"

function Login() {
  const [role, setRole] = useState("student")
  const [regNo, setRegNo] = useState("") 
  const [password, setPassword] = useState("")
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
      // Note: We force lowercase to match Firebase email format
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

        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          className="w-full mb-4 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-vitblue"
        />

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