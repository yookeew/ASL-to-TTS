import React, { useEffect, useRef, useState, useCallback } from "react";
import HandTracker from "./HandTracker";
import { normalizeAndFlatten } from "../utils/normalisation";

const STATIC_LETTERS = [
  "A","B","C","D","E","F","G","H","I",
  "K","L","M","N","O","P","Q","R","S",
  "T","U","V","W","X","Y"
];

const RECORDING_DURATION = 40000;

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

  const selectLetter = useCallback((letter) => {
    if (recording) return;
    currentLetter.current = letter;
    setSelectedLetter(letter);
  }, [recording]);

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
  }, [recording, startRecording, stopRecording, selectLetter]);

  const lettersWithData = new Set(Object.keys(samplesPerLetter));
  const lettersComplete = STATIC_LETTERS.filter(l => (samplesPerLetter[l] || 0) >= 500).length;
  const barPct = recording && countdown !== null
    ? ((RECORDING_DURATION / 1000 - countdown) / (RECORDING_DURATION / 1000)) * 100
    : 0;

  return (
    <div className="dc-root">
      <div className="dc-header">
        <span className="dc-title">ASL Data Collector</span>
        <span className="dc-progress-label">{lettersComplete} / {STATIC_LETTERS.length} letters ≥ 500 samples</span>
      </div>

      <div className="dc-layout">
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

        <div className="dc-panel">
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

          <div className="dc-hint">
            <span>keyboard:</span> letter key to select · <span>r</span> record · <span>esc</span> stop · <span>enter</span> export
            <br />
            <span>dot</span> on letter = has samples · aim for <span>500+</span> per letter
          </div>
        </div>
      </div>
    </div>
  );
}