import React, { useEffect, useRef } from "react";
import { Hands } from "@mediapipe/hands";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { Camera } from "@mediapipe/camera_utils";
import { isSixSeven } from "../utils/gestureUtils";

const HandTracker = ({ setGestureText, onLandmarks }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const leftBuffer = useRef([]);
  const rightBuffer = useRef([]);
  const lastTrigger = useRef(0);

  // Keep latest callback refs so the effect never needs to re-run
  const onLandmarksRef = useRef(onLandmarks);
  useEffect(() => { onLandmarksRef.current = onLandmarks; }, [onLandmarks]);

  const setGestureTextRef = useRef(setGestureText);
  useEffect(() => { setGestureTextRef.current = setGestureText; }, [setGestureText]);

  useEffect(() => {
    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`,
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.65,
      minTrackingConfidence: 0.6,
    });

    hands.onResults((results) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Mirror
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);

      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      // Draw landmarks for however many hands are present
      if (results.multiHandLandmarks) {
        results.multiHandLandmarks.forEach((landmarks) => {
          drawConnectors(ctx, landmarks, Hands.HAND_CONNECTIONS);
          drawLandmarks(ctx, landmarks);
        });
      }

      if (
        results.multiHandLandmarks &&
        results.multiHandedness &&
        results.multiHandLandmarks.length === 2
      ) {
        results.multiHandLandmarks.forEach((landmarks, i) => {
          const label = results.multiHandedness[i].label;

          // Track index (8) + middle (12) finger tips
          const avgY = (landmarks[8].y + landmarks[12].y) / 2;

          if (label === "Left") {
            leftBuffer.current.push(avgY);
            if (leftBuffer.current.length > 20) leftBuffer.current.shift();
          }

          if (label === "Right") {
            rightBuffer.current.push(avgY);
            if (rightBuffer.current.length > 20) rightBuffer.current.shift();
          }
        });

        // Evaluate gesture
        if (
          leftBuffer.current.length > 10 &&
          rightBuffer.current.length > 10
        ) {
          const now = Date.now();

          if (
            isSixSeven(leftBuffer.current, rightBuffer.current) &&
            now - lastTrigger.current > 1500
          ) {
            setGestureTextRef.current?.("67");
            lastTrigger.current = now;

            // Clear buffers after trigger
            leftBuffer.current = [];
            rightBuffer.current = [];
          }
        }
      } else {
        // Reset buffers if two hands aren't present
        leftBuffer.current = [];
        rightBuffer.current = [];
        setGestureTextRef.current?.("Show both hands");
      }

      // Always forward raw results — consumers filter themselves
      onLandmarksRef.current?.(results);

      ctx.restore();
    });

    if (videoRef.current) {
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          await hands.send({ image: videoRef.current });
        },
        width: 640,
        height: 480,
      });
      camera.start();
    }
  }, []);

  return (
    <div>
      <video ref={videoRef} style={{ display: "none" }} />
      <canvas ref={canvasRef} width={640} height={480} />
    </div>
  );
};

export default HandTracker;