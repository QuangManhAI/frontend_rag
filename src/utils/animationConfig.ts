/** Durations (seconds) of each visual phase of the query flight. */
export const animationConfig = {
  embedding: 2.2,
  /** Orb speed along branches, world units per second. */
  flightSpeed: 34,
  flightMin: 2.4,
  flightMax: 4.2,
  /** Pause at the first fork while route scores are read. */
  forkPause: 0.6,
  compareFirstDwell: 0.42,
  compareLastDwell: 0.08,
  compareTravelShare: 0.55,
  found: 1.8,
  generatingMin: 1.6,
  /** Reduce motion: each phase is shown in its final state for this long. */
  reducedHold: 0.45,
  /** Orb breathing period while waiting for data. */
  breathe: 1.4,
} as const;
