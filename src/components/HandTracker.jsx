import React, { useEffect, useRef } from "react";
import { Hands } from "@mediapipe/hands";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { Camera } from "@mediapipe/camera_utils";
import { isHandOpen } from "../utils/gestureUtils"; // your gesture logic

const HandTracker = ({ setGestureText }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const buffer = [];

  useEffect(() => {
    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults((results) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Mirror horizontally
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);

      // Draw webcam
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      // Draw landmarks
      if (results.multiHandLandmarks) {
        results.multiHandLandmarks.forEach((landmarks) => {
          drawConnectors(ctx, landmarks, Hands.HAND_CONNECTIONS);
          drawLandmarks(ctx, landmarks);

          // Push to buffer for smoothing
          buffer.push(landmarks);
          if (buffer.length > 10) buffer.shift();

          // Update displayed gesture
          if (setGestureText) {
            if (isHandOpen(landmarks)) {
              setGestureText("Hand is Open!");
            } else {
              setGestureText("Hand is Closed!");
            }
          }
        });
      } else if (setGestureText) {
        setGestureText("No hand detected");
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