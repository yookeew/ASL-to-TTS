import { useState, useRef, useEffect } from "react";
import HandTracker from "./components/HandTracker";
import DataCollector from "./components/DataCollector";
import { useASLModel } from "./utils/useASLModel";
import { normalizeAndFlatten } from "./utils/normalisation";

const MODE = "live"; // "live" | "collect"
const LETTER_COOLDOWN = 1500;
const NO_HAND_RESET = 700;

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0d0d0d;
    --surface: #161616;
    --border: #2a2a2a;
    --accent: #8794fa;
    --accent-dim: #5156e8;
    --danger: #ff4747;
    --text: #f0f0f0;
    --muted: #666;
    --mono: 'Space Mono', monospace;
    --sans: 'DM Sans', sans-serif;
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--sans);
    min-height: 100vh;
  }

  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    padding: 28px 32px 32px;
    position: relative;
    overflow: hidden;
  }

  .app::before {
    content: '';
    position: fixed;
    top: -200px;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(135, 148, 250, 0.06) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 28px;
    position: relative;
    z-index: 1;
  }

  .app-wordmark {
    font-family: var(--mono);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--text);
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .app-wordmark::before {
    content: '';
    display: block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 12px var(--accent);
  }

  .app-status {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.12em;
    color: var(--muted);
    text-transform: uppercase;
    transition: color 0.3s;
  }

  .app-status.ready {
    color: var(--accent);
  }

  .app-body {
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: 20px;
    flex: 1;
    position: relative;
    z-index: 1;
  }

  .camera-frame {
    position: relative;
    background: #000;
    border: 1px solid var(--border);
    overflow: hidden;
  }

  .camera-frame canvas {
    display: block;
    width: 100%;
    height: auto;
  }

  .camera-frame::before,
  .camera-frame::after {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    z-index: 2;
    pointer-events: none;
  }
  .camera-frame::before {
    top: 0; left: 0;
    border-top: 2px solid var(--accent);
    border-left: 2px solid var(--accent);
  }
  .camera-frame::after {
    bottom: 0; right: 0;
    border-bottom: 2px solid var(--accent);
    border-right: 2px solid var(--accent);
  }

  .right-panel {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .panel-label {
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 8px;
  }

  .word-display {
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 22px 20px 16px;
    min-height: 130px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
    transition: border-color 0.3s;
  }

  .word-display.has-word {
    border-color: #3a3a4a;
  }

  .word-display::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), transparent);
    opacity: 0;
    transition: opacity 0.4s;
  }

  .word-display.has-word::after {
    opacity: 1;
  }

  .word-text {
    font-family: var(--mono);
    font-size: 32px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: 0.12em;
    word-break: break-all;
    line-height: 1.3;
  }

  .word-placeholder {
    font-family: var(--sans);
    font-size: 14px;
    font-style: italic;
    color: var(--muted);
    font-weight: 300;
  }

  .word-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 14px;
  }

  .word-length {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--muted);
  }

  .speaking-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--accent);
    opacity: 0;
    transition: opacity 0.2s;
  }

  .speaking-indicator.active { opacity: 1; }

  .speaking-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--accent);
    animation: speakpulse 0.7s ease-in-out infinite alternate;
  }

  @keyframes speakpulse {
    from { transform: scale(1); opacity: 1; }
    to { transform: scale(1.6); opacity: 0.3; }
  }

  .last-letter-block {
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 16px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .last-letter {
    font-family: var(--mono);
    font-size: 56px;
    font-weight: 700;
    color: var(--accent);
    line-height: 1;
    text-shadow: 0 0 30px rgba(135, 148, 250, 0.25);
    transition: color 0.15s;
  }

  .last-letter.empty { color: var(--border); }

  .last-letter-label {
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 0.15em;
    color: var(--muted);
    text-transform: uppercase;
  }

  .hint-block {
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 14px 16px;
    margin-top: auto;
  }

  .hint-row {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--muted);
    line-height: 2.2;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .hint-key {
    color: var(--text);
    background: #1e1e1e;
    border: 1px solid var(--border);
    padding: 1px 6px;
    font-size: 10px;
    font-family: var(--mono);
  }

  @keyframes letterPop {
    0% { opacity: 0; transform: translateY(3px); }
    100% { opacity: 1; transform: translateY(0); }
  }
`;

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

  const speakWord = (text) => {
    setSpeaking(true);
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleLandmarks = async (results) => {
    const hasHand = results.multiHandLandmarks?.length === 1;

    if (!hasHand) {
      if (!noHandTimer.current) {
        noHandTimer.current = setTimeout(() => {
          if (wordRef.current) speakWord(wordRef.current);
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
    <>
      <style>{styles}</style>
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

              <div className="hint-block" style={{ marginTop: "auto" }}>
                <div className="hint-row">
                  Sign a letter to append to the word
                </div>
                <div className="hint-row">
                  Hide hand for <span className="hint-key">{NO_HAND_RESET / 1000}s</span> to speak + clear
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default App;