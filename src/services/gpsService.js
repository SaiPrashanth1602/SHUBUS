import { ref, onValue } from "firebase/database";
import { rtdb } from "../config/firebase";

export const listenToBusLocation = (busId, callback) => {
  const busRef = ref(rtdb, `buses/${busId}`);

  return onValue(busRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      callback(data);
    }
  });
};