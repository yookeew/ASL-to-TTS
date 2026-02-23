import React, { useEffect, useRef, useState, useCallback } from "react";
import HandTracker from "./HandTracker";
import { normalizeAndFlatten } from "../utils/normalisation";

const STATIC_LETTERS = [
  "A","B","C","D","E","F","G","H","I",
  "K","L","M","N","O","P","Q","R","S",
  "T","U","V","W","X","Y"
];

const RECORDING_DURATION = 40000; // 60 seconds → ~600 frames @ every 3rd frame

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500&display=swap');

  .dc-root {
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
    background: var(--bg);
    color: var(--text);
    font-family: var(--sans);
    min-height: 100vh;
    padding: 32px;
    box-sizing: border-box;
  }

  .dc-header {
    display: flex;
    align-items: baseline;
    gap: 16px;
    margin-bottom: 32px;
  }
  .dc-title {
    font-family: var(--mono);
    font-size: 13px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .dc-progress-label {
    font-family: var(--mono);
    font-size: 13px;
    color: var(--accent);
    margin-left: auto;
  }

  .dc-layout {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 24px;
    align-items: start;
  }

  .dc-camera-block {
    position: relative;
    border: 1px solid var(--border);
    background: #000;
    overflow: hidden;
  }
  .dc-camera-block canvas {
    display: block;
    width: 100%;
    height: auto;
  }

  /* Recording overlay bar */
  .dc-rec-bar {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 4px;
    background: var(--border);
    overflow: hidden;
  }
  .dc-rec-bar-fill {
    height: 100%;
    background: var(--accent);
    transition: width 0.25s linear;
    box-shadow: 0 0 12px var(--accent);
  }

  .dc-rec-indicator {
    position: absolute;
    top: 14px; right: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.1em;
    opacity: 0;
    transition: opacity 0.3s;
  }
  .dc-rec-indicator.active {
    opacity: 1;
  }
  .dc-rec-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--danger);
    animation: blink 1s ease-in-out infinite;
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.2; }
  }

  .dc-letter-badge {
    position: absolute;
    top: 14px; left: 14px;
    font-family: var(--mono);
    font-size: 48px;
    font-weight: 700;
    color: var(--accent);
    line-height: 1;
    text-shadow: 0 0 40px rgba(232, 255, 71, 0.4);
  }

  /* Right panel */
  .dc-panel {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .dc-section-label {
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 10px;
  }

  /* Letter grid */
  .dc-letter-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 6px;
  }
  .dc-letter-btn {
    aspect-ratio: 1;
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text);
    font-family: var(--mono);
    font-size: 14px;
    cursor: pointer;
    transition: all 0.12s;
    position: relative;
    overflow: hidden;
  }
  .dc-letter-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  .dc-letter-btn.selected {
    background: var(--accent);
    border-color: var(--accent);
    color: #000;
  }
  .dc-letter-btn.has-data::after {
    content: '';
    position: absolute;
    bottom: 3px; right: 3px;
    width: 4px; height: 4px;
    border-radius: 50%;
    background: var(--accent);
  }
  .dc-letter-btn.selected.has-data::after {
    background: #000;
  }

  /* Stats row */
  .dc-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .dc-stat {
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 12px 14px;
  }
  .dc-stat-val {
    font-family: var(--mono);
    font-size: 24px;
    font-weight: 700;
    color: var(--accent);
    line-height: 1;
  }
  .dc-stat-key {
    font-size: 11px;
    color: var(--muted);
    margin-top: 4px;
  }

  /* Countdown */
  .dc-countdown {
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 16px;
    text-align: center;
    min-height: 72px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .dc-countdown-num {
    font-family: var(--mono);
    font-size: 40px;
    font-weight: 700;
    color: var(--accent);
    line-height: 1;
    transition: color 0.2s;
  }
  .dc-countdown-num.urgent {
    color: var(--danger);
    animation: pulse 0.5s ease-in-out infinite alternate;
  }
  @keyframes pulse {
    from { transform: scale(1); }
    to { transform: scale(1.06); }
  }
  .dc-countdown-label {
    font-size: 11px;
    color: var(--muted);
    margin-top: 4px;
    font-family: var(--mono);
    letter-spacing: 0.1em;
  }
  .dc-countdown-idle {
    font-size: 13px;
    color: var(--muted);
  }

  /* Buttons */
  .dc-btn {
    width: 100%;
    padding: 14px;
    font-family: var(--mono);
    font-size: 13px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    border: 1px solid;
    transition: all 0.12s;
    background: transparent;
  }
  .dc-btn-record {
    color: #000;
    background: var(--accent);
    border-color: var(--accent);
  }
  .dc-btn-record:hover:not(:disabled) {
    background: var(--accent-dim);
    border-color: var(--accent-dim);
  }
  .dc-btn-record:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .dc-btn-stop {
    color: var(--danger);
    border-color: var(--danger);
  }
  .dc-btn-stop:hover {
    background: var(--danger);
    color: #fff;
  }
  .dc-btn-download {
    color: var(--muted);
    border-color: var(--border);
  }
  .dc-btn-download:hover:not(:disabled) {
    color: var(--text);
    border-color: var(--text);
  }
  .dc-btn-download:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .dc-hint {
    font-size: 11px;
    color: var(--muted);
    line-height: 1.6;
    font-family: var(--mono);
  }
  .dc-hint span {
    color: var(--text);
  }
`;

export default function DataCollector() {
  const dataset = useRef([]);
  const isRecording = useRef(false);
  const currentLetter = useRef("A");
  const frameSkip = useRef(0);

  const [selectedLetter, setSelectedLetter] = useState("A");
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [samplesPerLetter, setSamplesPerLetter] = useState({});
  const [totalSamples, setTotalSamples] = useState(0);

  const countdownInterval = useRef(null);
  const stopTimeout = useRef(null);

  const selectLetter = (letter) => {
    if (recording) return;
    currentLetter.current = letter;
    setSelectedLetter(letter);
  };

  const stopRecording = useCallback(() => {
    isRecording.current = false;
    setRecording(false);
    setCountdown(null);
    clearInterval(countdownInterval.current);
    clearTimeout(stopTimeout.current);
  }, []);

  const startRecording = useCallback(() => {
    if (isRecording.current) return;
    frameSkip.current = 0;
    isRecording.current = true;
    setRecording(true);

    const durationSec = RECORDING_DURATION / 1000;
    setCountdown(durationSec);

    countdownInterval.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    stopTimeout.current = setTimeout(() => {
      isRecording.current = false;
      setRecording(false);
      setCountdown(null);
    }, RECORDING_DURATION);
  }, []);

  const handleLandmarks = useCallback((results) => {
    if (!isRecording.current || results.multiHandLandmarks?.length !== 1) return;

    frameSkip.current++;
    if (frameSkip.current % 3 !== 0) return;

    const flattened = normalizeAndFlatten(results.multiHandLandmarks[0]);
    const label = currentLetter.current;
    dataset.current.push([...flattened, label]);

    // Update counts every 10 frames to avoid thrashing
    if (frameSkip.current % 30 === 0) {
      const counts = {};
      for (const row of dataset.current) {
        const l = row[row.length - 1];
        counts[l] = (counts[l] || 0) + 1;
      }
      setSamplesPerLetter(counts);
      setTotalSamples(dataset.current.length);
    }
  }, []);

  const downloadCSV = () => {
    if (dataset.current.length === 0) return;
    const header = Array.from({ length: 63 }, (_, i) => `f${i}`).join(",");
    const rows = dataset.current.map(row => row.join(",")).join("\n");
    const csv = header + ",label\n" + rows;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "asl_static_dataset.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const letter = e.key.toUpperCase();
      if (STATIC_LETTERS.includes(letter)) selectLetter(letter);
      if (e.key === "r" && !recording) startRecording();
      if (e.key === "Escape" && recording) stopRecording();
      if (e.key === "Enter") downloadCSV();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [recording, startRecording, stopRecording]);

  const lettersWithData = new Set(Object.keys(samplesPerLetter));
  const lettersComplete = STATIC_LETTERS.filter(l => (samplesPerLetter[l] || 0) >= 500).length;
  const barPct = recording && countdown !== null
    ? ((RECORDING_DURATION / 1000 - countdown) / (RECORDING_DURATION / 1000)) * 100
    : 0;

  return (
    <>
      <style>{styles}</style>
      <div className="dc-root">
        <div className="dc-header">
          <span className="dc-title">ASL Data Collector</span>
          <span className="dc-progress-label">{lettersComplete} / {STATIC_LETTERS.length} letters ≥ 500 samples</span>
        </div>

        <div className="dc-layout">
          {/* Camera */}
          <div className="dc-camera-block">
            <HandTracker onLandmarks={handleLandmarks} setGestureText={() => {}} />
            <div className="dc-letter-badge">{selectedLetter}</div>
            <div className={`dc-rec-indicator ${recording ? "active" : ""}`}>
              <div className="dc-rec-dot" />
              REC
            </div>
            <div className="dc-rec-bar">
              <div className="dc-rec-bar-fill" style={{ width: `${barPct}%` }} />
            </div>
          </div>

          {/* Right panel */}
          <div className="dc-panel">

            {/* Letter selector */}
            <div>
              <div className="dc-section-label">Select Letter</div>
              <div className="dc-letter-grid">
                {STATIC_LETTERS.map(l => (
                  <button
                    key={l}
                    className={`dc-letter-btn ${selectedLetter === l ? "selected" : ""} ${lettersWithData.has(l) ? "has-data" : ""}`}
                    onClick={() => selectLetter(l)}
                    title={`${samplesPerLetter[l] || 0} samples`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="dc-stats">
              <div className="dc-stat">
                <div className="dc-stat-val">{samplesPerLetter[selectedLetter] || 0}</div>
                <div className="dc-stat-key">samples — {selectedLetter}</div>
              </div>
              <div className="dc-stat">
                <div className="dc-stat-val">{totalSamples}</div>
                <div className="dc-stat-key">total samples</div>
              </div>
            </div>

            {/* Countdown */}
            <div className="dc-countdown">
              {countdown !== null ? (
                <>
                  <div className={`dc-countdown-num ${countdown <= 10 ? "urgent" : ""}`}>
                    {countdown}s
                  </div>
                  <div className="dc-countdown-label">recording {selectedLetter}</div>
                </>
              ) : (
                <div className="dc-countdown-idle">
                  Ready — select a letter and press Record
                </div>
              )}
            </div>

            {/* Actions */}
            {!recording ? (
              <button className="dc-btn dc-btn-record" onClick={startRecording}>
                ▶ Record {selectedLetter}
              </button>
            ) : (
              <button className="dc-btn dc-btn-stop" onClick={stopRecording}>
                ■ Stop Recording
              </button>
            )}

            <button
              className="dc-btn dc-btn-download"
              onClick={downloadCSV}
              disabled={totalSamples === 0}
            >
              ↓ Export CSV ({totalSamples} rows)
            </button>

            {/* Hints */}
            <div className="dc-hint">
              <span>keyboard:</span> letter key to select · <span>r</span> record · <span>esc</span> stop · <span>enter</span> export
              <br />
              <span>dot</span> on letter = has samples · aim for <span>500+</span> per letter
            </div>

          </div>
        </div>
      </div>
    </>
  );
}