import { useState } from "react";
import HandTracker from "./components/HandTracker";

function App() {
  const [gestureText, setGestureText] = useState("Move your hand...");

  return (
    <div className="App">
      <h1>ASL-TTS</h1>
      <HandTracker setGestureText={setGestureText} />
      <p style={{ fontSize: "24px", marginTop: "20px" }}>{gestureText}</p>
    </div>
  );
}

export default App;