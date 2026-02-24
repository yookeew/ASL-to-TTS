import { useState } from "react";
import HandTracker from "./components/HandTracker";
import DataCollector from "./components/DataCollector";
import { useASLModel } from "./utils/useASLModel";
import { normalizeAndFlatten } from "./utils/normalisation";

const MODE = "live"; // "live" | "collect"

function App() {
  const [gestureText, setGestureText] = useState("Move your hand...");
  const { predict, ready } = useASLModel();

  const handleLandmarks = async (results) => {
    if (!ready || results.multiHandLandmarks?.length !== 1) return;
    const flattened = normalizeAndFlatten(results.multiHandLandmarks[0]);
    const letter = await predict(flattened);
    if (letter) setGestureText(letter);
  };

  return (
    <div className="App">
      <h1>ASL-TTS</h1>
      {MODE === "collect" ? (
        <DataCollector />
      ) : (
        <HandTracker setGestureText={setGestureText} onLandmarks={handleLandmarks} />
      )}
      {MODE === "live" && (
        <p style={{ fontSize: "24px", marginTop: "20px" }}>
          {ready ? gestureText : "Loading model..."}
        </p>
      )}
    </div>
  );
}

export default App;