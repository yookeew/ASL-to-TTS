export function isHandOpen(landmarks) {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  return indexTip.y < landmarks[6].y && thumbTip.x < landmarks[3].x;
}