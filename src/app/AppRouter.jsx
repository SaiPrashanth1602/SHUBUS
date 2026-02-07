import { BrowserRouter, Routes, Route } from "react-router-dom"

import Login from "../pages/common/Login"
import StudentDashboard from "../student/StudentDashboard"
import SeatLayout from "../student/SeatLayout"
import AdminDashboard from "../admin/AdminDashboard"
import BookingView from "../student/BookingView"
import SeatClaim from "../student/SeatClaim"
import AddBus from "../admin/AddBus"
import ViewBuses from "../admin/ViewBuses"
import ViewBookings from "../admin/ViewBookings"



function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />

                <Route path="/student" element={<StudentDashboard />} />
                <Route path="/student/seat-layout/:busId" element={<SeatLayout />} />

                <Route path="/admin" element={<AdminDashboard />} />
                <Route
                    path="/student/booking"
                    element={<BookingView />}
                />
                <Route
                    path="/student/seat-claim"
                    element={<SeatClaim />}
                />
                <Route path="/admin/add-bus" element={<AddBus />} />
                <Route path="/admin/view-buses" element={<ViewBuses />} />
                <Route path="/admin/bookings" element={<ViewBookings />} />

            </Routes>
        </BrowserRouter>
    )
}

export default AppRouter
