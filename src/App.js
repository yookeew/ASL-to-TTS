import { useState } from "react";
import HandTracker from "./components/HandTracker";
import DataCollector from "./components/DataCollector";

const MODE = "collect"; // "live" | "collect"

function App() {
  const [gestureText, setGestureText] = useState("Move your hand...");

  return (
    <div className="App">
      <h1>ASL-TTS</h1>
      {MODE === "collect" ? (
        <DataCollector />
      ) : (
        <HandTracker setGestureText={setGestureText} />
      )}
      {MODE === "live" && (
        <p style={{ fontSize: "24px", marginTop: "20px" }}>{gestureText}</p>
      )}
    </div>
  );
}

export default App;