/**
 * Durations (seconds) of each visual phase of the query flight. Tuned slow on purpose: fast orb
 * jumps dragged the camera around, which looked jerky and was tiring to watch.
 */
export const animationConfig = {
  embedding: 2.8,
  /** Orb speed along branches, world units per second. */
  flightSpeed: 20,
  flightMin: 3.6,
  flightMax: 6.5,
  /** Pause at the first fork while route scores are read. */
  forkPause: 0.9,
  compareFirstDwell: 0.6,
  compareLastDwell: 0.14,
  compareTravelShare: 0.55,
  /** Orb settles next to the best result and the camera frames it; then the view pulls back. */
  found: 3.2,
  generatingMin: 1.6,
  /** Reduce motion: each phase is shown in its final state for this long. */
  reducedHold: 0.45,
  /** Orb breathing period while waiting for data. */
  breathe: 1.4,
} as const;

/**
 * The 3D scene slides with the chat column: same length as its CSS slide (`--dur-scene` in
 * index.css, guarded by motionSync.test.ts), starting a bit after it.
 */
export const CHAT_SLIDE_S = 1.5;
export const CHAT_SLIDE_DELAY_S = 0.5;
