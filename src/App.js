import { useState, useRef, useEffect } from "react";
import HandTracker from "./components/HandTracker";
import DataCollector from "./components/DataCollector";
import { useASLModel } from "./utils/useASLModel";
import { normalizeAndFlatten } from "./utils/normalisation";

const MODE = "live"; // "live" | "collect"
const LETTER_COOLDOWN = 1500;  // ms before same letter can append again
const NO_HAND_RESET = 700;     // ms of no hand before speaking + clearing

const speak = (text) => {
  window.speechSynthesis.cancel(); // stop anything already speaking
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
};

function App() {
  const [word, setWord] = useState("");
  const { predict, ready } = useASLModel();

  const lastAppendedLetter = useRef(null);
  const lastAppendTime = useRef(0);
  const noHandTimer = useRef(null);
  const wordRef = useRef("");

  // Keep wordRef in sync with word state
  useEffect(() => {
    wordRef.current = word;
  }, [word]);

  const handleLandmarks = async (results) => {
    const hasHand = results.multiHandLandmarks?.length === 1;

    if (!hasHand) {
      if (!noHandTimer.current) {
        noHandTimer.current = setTimeout(() => {
          if (wordRef.current) speak(wordRef.current);
          setWord("");
          lastAppendedLetter.current = null;
          noHandTimer.current = null;
        }, NO_HAND_RESET);
      }
      return;
    }

    // Hand is present — cancel any pending reset
    if (noHandTimer.current) {
      clearTimeout(noHandTimer.current);
      noHandTimer.current = null;
    }

    if (!ready) return;

    const flattened = normalizeAndFlatten(results.multiHandLandmarks[0]);
    const letter = await predict(flattened);
    if (!letter) return;

    const now = Date.now();
    const sameAsLast = letter === lastAppendedLetter.current;
    const withinCooldown = now - lastAppendTime.current < LETTER_COOLDOWN;

    if (sameAsLast && withinCooldown) return;

    setWord(prev => prev + letter);
    lastAppendedLetter.current = letter;
    lastAppendTime.current = now;
  };

  return (
    <div className="App">
      <h1>ASL-TTS</h1>
      {MODE === "collect" ? (
        <DataCollector />
      ) : (
        <HandTracker setGestureText={() => {}} onLandmarks={handleLandmarks} />
      )}
      {MODE === "live" && (
        <p style={{ fontSize: "24px", marginTop: "20px" }}>
          {ready ? (word || "Start signing...") : "Loading model..."}
        </p>
      )}
    </div>
  );
}

export default App;