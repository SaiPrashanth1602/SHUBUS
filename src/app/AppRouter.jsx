import { BrowserRouter, Routes, Route } from "react-router-dom"

import Login from "../pages/common/Login"

// Student
import StudentDashboard from "../student/StudentDashboard"
import SeatLayout from "../student/SeatLayout"
import BookingView from "../student/BookingView" // Success Page (Temporary)
import SeatClaim from "../student/SeatClaim"
import StudentBooking from "../student/StudentBooking.jsx" // ✅ NEW: Import the DB-Connected Page

// Admin
import AdminDashboard from "../admin/AdminDashboard"
import AddShuttle from "../admin/AddShuttle"
import Buses from "../admin/Buses"
import ViewBookings from "../admin/ViewBookings"
import AddBus from "../admin/AddBus"

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login */}
        <Route path="/" element={<Login />} />

        {/* Student Routes */}
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/student/seat-layout/:busId" element={<SeatLayout />} />
        
        {/* Success Page (Transient - only after booking) */}
        <Route path="/student/booking" element={<BookingView />} />
        
        {/* ✅ NEW: My Bookings (Permanent - fetches from Firebase) */}
        <Route path="/student/my-bookings" element={<StudentBooking />} />
        
        <Route path="/student/seat-claim" element={<SeatClaim />} />
<Route path="/seat-claim" element={<SeatClaim />} />
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/add-shuttle" element={<AddShuttle />} />
        <Route path="/admin/buses" element={<Buses />} />
        <Route path="/admin/bookings" element={<ViewBookings />} />
        <Route path="/admin/add-bus" element={<AddBus />} />

      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter