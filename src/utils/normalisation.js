export function normalizeAndFlatten(landmarks) {
  const wrist = landmarks[0];
  const normalized = landmarks.map(p => ({
    x: p.x - wrist.x,
    y: p.y - wrist.y,
    z: p.z - wrist.z,
  }));
  return normalized.flatMap(p => [p.x, p.y, p.z]);
}