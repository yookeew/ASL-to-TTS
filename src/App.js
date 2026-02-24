import { useState, useRef, useEffect } from "react";
import HandTracker from "./components/HandTracker";
import DataCollector from "./components/DataCollector";
import { useASLModel } from "./utils/useASLModel";
import { normalizeAndFlatten } from "./utils/normalisation";

const MODE = "live"; // "live" | "collect"
const LETTER_COOLDOWN = 1500;
const NO_HAND_RESET = 400;

const speak = (text, onEnd) => {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.8;
  utterance.pitch = 1.2;
  utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
};

function App() {
  const [word, setWord] = useState("");
  const [lastLetter, setLastLetter] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const { predict, ready } = useASLModel();

  const lastAppendedLetter = useRef(null);
  const lastAppendTime = useRef(0);
  const noHandTimer = useRef(null);
  const wordRef = useRef("");

  useEffect(() => {
    wordRef.current = word;
  }, [word]);

  const handleLandmarks = async (results) => {
    const hasHand = results.multiHandLandmarks?.length === 1;

    if (!hasHand) {
      if (!noHandTimer.current) {
        noHandTimer.current = setTimeout(() => {
          if (wordRef.current) {
            setSpeaking(true);
            speak(wordRef.current, () => setSpeaking(false));
          }
          setWord("");
          setLastLetter("");
          lastAppendedLetter.current = null;
          noHandTimer.current = null;
        }, NO_HAND_RESET);
      }
      return;
    }

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
    setLastLetter(letter);
    lastAppendedLetter.current = letter;
    lastAppendTime.current = now;
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-wordmark">ASL — TTS</div>
        <div className={`app-status ${ready ? "ready" : ""}`}>
          {ready ? "model ready" : "loading model..."}
        </div>
      </header>

      {MODE === "collect" ? (
        <DataCollector />
      ) : (
        <div className="app-body">
          <div className="camera-frame">
            <HandTracker setGestureText={() => {}} onLandmarks={handleLandmarks} />
          </div>

          <div className="right-panel">
            <div>
              <div className="panel-label">Output</div>
              <div className={`word-display ${word ? "has-word" : ""}`}>
                {word
                  ? <div className="word-text">{word}</div>
                  : <div className="word-placeholder">
                      {ready ? "Start signing..." : "Loading model..."}
                    </div>
                }
                <div className="word-meta">
                  <div className="word-length">
                    {word.length > 0 ? `${word.length} letter${word.length !== 1 ? "s" : ""}` : ""}
                  </div>
                  <div className={`speaking-indicator ${speaking ? "active" : ""}`}>
                    <div className="speaking-dot" />
                    speaking
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="panel-label">Detecting</div>
              <div className="last-letter-block">
                <div className={`last-letter ${!lastLetter ? "empty" : ""}`}>
                  {lastLetter || "—"}
                </div>
                <div className="last-letter-label">last letter</div>
              </div>
            </div>

            <div className="hint-block">
              <div className="hint-row">Sign a letter to append to the word</div>
              <div className="hint-row">
                Hide hand for <span className="hint-key">{NO_HAND_RESET / 1000}s</span> to speak + clear
              </div>
              <div className="hint-row">If there is error, have you tried refreshing?</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;