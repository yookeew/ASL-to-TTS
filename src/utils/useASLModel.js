import { useEffect, useRef, useState } from "react";
import * as ort from "onnxruntime-web";

// --- Tune these ---
const CONFIDENCE_THRESHOLD = 0.65; // only accept predictions above this
const BUFFER_SIZE = 3;            // frames to majority vote across
const REQUIRED_CONSENSUS = 0.90;   // 75% of buffer must agree on same letter
// ------------------

export function useASLModel() {
  const sessionRef = useRef(null);
  const [ready, setReady] = useState(false);
  const predictionBuffer = useRef([]);

  useEffect(() => {
    ort.InferenceSession.create("/asl_model.onnx").then((session) => {
      sessionRef.current = session;
      setReady(true);
    });
  }, []);

  const predict = async (flatLandmarks) => {
    if (!sessionRef.current) return null;

    const tensor = new ort.Tensor(
      "float32",
      Float32Array.from(flatLandmarks),
      [1, 63]
    );

    const feeds = { float_input: tensor };
    const results = await sessionRef.current.run(feeds);

    // Confidence gate — ignore low certainty frames entirely
    const probs = Array.from(results.probabilities.data);
    const maxProb = Math.max(...probs);
    if (maxProb < CONFIDENCE_THRESHOLD) {
      predictionBuffer.current = []; // uncertain frame resets buffer
      return null;
    }

    const letter = results.label.data[0];

    // Rolling buffer majority vote
    predictionBuffer.current.push(letter);
    if (predictionBuffer.current.length > BUFFER_SIZE)
      predictionBuffer.current.shift();

    // Only return a letter if enough of the buffer agrees
    const counts = {};
    for (const l of predictionBuffer.current)
      counts[l] = (counts[l] || 0) + 1;

    const [topLetter, topCount] = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])[0];

    const consensus = topCount / predictionBuffer.current.length;
    if (consensus < REQUIRED_CONSENSUS) return null;

    return topLetter;
  };

  return { predict, ready };
}