import React, { useEffect, useRef } from "react";
import { Hands } from "@mediapipe/hands";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { Camera } from "@mediapipe/camera_utils";
import { isSixSeven } from "../utils/gestureUtils";

const HandTracker = ({ setGestureText }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const leftBuffer = useRef([]);
  const rightBuffer = useRef([]);
  const lastTrigger = useRef(0);

  useEffect(() => {
    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
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

      if (
        results.multiHandLandmarks &&
        results.multiHandedness &&
        results.multiHandLandmarks.length === 2
      ) {
        results.multiHandLandmarks.forEach((landmarks, i) => {
          drawConnectors(ctx, landmarks, Hands.HAND_CONNECTIONS);
          drawLandmarks(ctx, landmarks);

          const label = results.multiHandedness[i].label;

          // Track index (8) + middle (12) finger tips
          const avgY = (landmarks[8].y + landmarks[12].y) / 2;
          //const avgY = landmarks[0].y; // wrist

          if (label === "Left") {
            leftBuffer.current.push(avgY);
            if (leftBuffer.current.length > 20)
              leftBuffer.current.shift();
          }

          if (label === "Right") {
            rightBuffer.current.push(avgY);
            if (rightBuffer.current.length > 20)
              rightBuffer.current.shift();
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
            setGestureText("67");
            lastTrigger.current = now;

            // Clear buffers after trigger
            leftBuffer.current = [];
            rightBuffer.current = [];
          }
        }

      } else {
        // Reset if both hands disappear
        leftBuffer.current = [];
        rightBuffer.current = [];
        setGestureText("Show both hands");
      }

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
  }, [setGestureText]);

  return (
    <div>
      <video ref={videoRef} style={{ display: "none" }} />
      <canvas ref={canvasRef} width={640} height={480} />
    </div>
  );
};

export default HandTracker;