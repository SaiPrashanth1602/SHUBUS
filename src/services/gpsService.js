import { ref, onValue } from "firebase/database";
import { rtdb } from "../config/firebase";

export const listenToBusLocation = (busId, callback) => {
  console.log("🔥 Listening to:", `buses/${busId}`);

  const busRef = ref(rtdb, `buses/${busId}`);

  return onValue(busRef, (snapshot) => {
    const data = snapshot.val();

    console.log("🔥 Firebase Snapshot:", data);

    if (data) {
      callback(data);
    }
  });
};