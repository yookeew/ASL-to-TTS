export function isHandOpen(landmarks) {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  return indexTip.y < landmarks[6].y && thumbTip.x < landmarks[3].x;
}

export function isSixSeven(leftBuffer, rightBuffer) {
  if (leftBuffer.length < 12 || rightBuffer.length < 12) return false;

  let phase1 = false;
  let phase2 = false;

  for (let i = 1; i < leftBuffer.length; i++) {
    const leftDelta = leftBuffer[i] - leftBuffer[i - 1];
    const rightDelta = rightBuffer[i] - rightBuffer[i - 1];

    // Threshold to avoid noise
    const threshold = 0.008;

    const leftUp = leftDelta < -threshold;
    const leftDown = leftDelta > threshold;
    const rightUp = rightDelta < -threshold;
    const rightDown = rightDelta > threshold;

    // Phase 1: Left up + Right down
    if (leftUp && rightDown) {
      phase1 = true;
    }

    // Phase 2: Left down + Right up
    if (leftDown && rightUp) {
      phase2 = true;
    }
  }

  return phase1 && phase2;
}