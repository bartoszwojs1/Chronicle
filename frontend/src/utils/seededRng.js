// Cheap linear congruential generator — deterministic across renders
// so sparklines don't jitter when React re-runs.
export function seeded(seed) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}
