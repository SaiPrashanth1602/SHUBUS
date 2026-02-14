import { useState, useEffect } from "react";
import PageWrapper from "../components/layout/PageWrapper";
import { useNavigate, useLocation } from "react-router-dom";
import { listenToBusLocation } from "../services/gpsService";

function SeatClaim() {
  const [claimed, setClaimed] = useState(false);
  const [busLocation, setBusLocation] = useState(null);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const ticket = location.state?.ticket;

  // Redirect if no ticket
  useEffect(() => {
    if (!ticket) {
      navigate("/student");
    }
  }, [ticket, navigate]);

  // Listen to bus GPS
  useEffect(() => {
    const unsubscribe = listenToBusLocation("bus1", (data) => {
      setBusLocation(data);
    });

    return () => unsubscribe();
  }, []);

  // Haversine distance formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const toRad = (val) => (val * Math.PI) / 180;

    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);

    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) *
        Math.cos(φ2) *
        Math.sin(Δλ / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const handleClaim = () => {
    setError("");

    if (!busLocation) {
      setError("Bus location not available yet.");
      return;
    }

    if (!navigator.geolocation) {
      setError("Geolocation not supported.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const studentLat = position.coords.latitude;
        const studentLng = position.coords.longitude;

        const distance = calculateDistance(
          studentLat,
          studentLng,
          busLocation.latitude,
          busLocation.longitude
        );

        console.log("Distance from bus:", distance, "meters");

        if (distance <= 50) {
          setClaimed(true);
        } else {
          setError("You are too far from the bus to claim the seat.");
        }
      },
      () => {
        setError("Location access denied.");
      }
    );
  };

  return (
    <PageWrapper role="student">
      <h1 className="text-2xl font-bold text-vitblue mb-4">
        Seat Claim
      </h1>

      <div className="bg-white p-6 rounded-xl shadow max-w-md mx-auto text-center">
        {!claimed ? (
          <>
            <p className="text-gray-700 mb-4">
              Please claim your seat when you are near the bus.
            </p>

            <div className="bg-yellow-100 text-yellow-800 p-3 rounded-lg text-sm mb-4">
              ⚠️ Seat claim is verified using live GPS
            </div>

            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            {ticket && (
              <div className="mb-6 text-left bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Route</p>
                <p className="font-semibold">
                  {ticket.route || ticket.busDetails?.route}
                </p>

                <p className="text-sm text-gray-500 mt-2">Seat</p>
                <p className="font-semibold text-lg">
                  {ticket.seatNumber}
                </p>
              </div>
            )}

            <button
              onClick={handleClaim}
              className="w-full bg-vitblue text-white py-3 rounded-lg font-semibold hover:opacity-90"
            >
              Claim Seat
            </button>
          </>
        ) : (
          <>
            <div className="text-green-600 text-lg font-semibold mb-4">
              ✅ Seat Successfully Claimed
            </div>

            <button
              onClick={() => navigate("/student")}
              className="mt-4 w-full bg-vitblue text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Back to Dashboard
            </button>

            <p className="text-gray-600 text-sm mt-4">
              You may now board the bus.
            </p>
          </>
        )}
      </div>
    </PageWrapper>
  );
}

export default SeatClaim;