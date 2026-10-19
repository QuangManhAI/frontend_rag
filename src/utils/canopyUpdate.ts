/**
 * Incremental canopy state updates. The filter (highlights) lives in a per-point mask + a shader
 * uniform, so switching filters only touches the indices of the old and new selection; the flight
 * overlay (≤ a few dozen entries) is diffed by key. Visual result equals the old full `diffStates`
 * pass: effective state = overlay state if set, else 1 (dimmed) when a filter is active and the
 * point is outside it, else 0.
 */

/** Rewrites the mask for prev → next highlights; returns the indices whose mask changed. */
export function updateFilterMask(mask: Uint8Array, prev: Uint32Array | null, next: Uint32Array | null): number[] {
  const changed: number[] = [];
  if (prev) for (let k = 0; k < prev.length; k++) mask[prev[k]] = 2; // 2 = "was on", resolved below
  if (next) {
    for (let k = 0; k < next.length; k++) {
      const i = next[k];
      if (mask[i] === 2) mask[i] = 1; // still on — unchanged
      else if (mask[i] === 0) {
        mask[i] = 1;
        changed.push(i);
      }
    }
  }
  if (prev) {
    for (let k = 0; k < prev.length; k++) {
      const i = prev[k];
      if (mask[i] === 2) {
        mask[i] = 0;
        changed.push(i);
      }
    }
  }
  return changed;
}

/** Applies overlay prev → next to the state attribute; returns the indices that changed. */
export function updateOverlayStates(state: Float32Array, prev: ReadonlyMap<number, number>, next: ReadonlyMap<number, number>): number[] {
  const changed: number[] = [];
  for (const i of prev.keys()) {
    if (!next.has(i) && i >= 0 && i < state.length && state[i] !== 0) {
      state[i] = 0;
      changed.push(i);
    }
  }
  for (const [i, s] of next) {
    if (i < 0 || i >= state.length || state[i] === s) continue;
    state[i] = s;
    changed.push(i);
  }
  return changed;
}

/** Effective state seen by the shader (for tests / equivalence with `diffStates`). */
export function effectiveState(state: Float32Array, mask: Uint8Array, filterActive: boolean, i: number): number {
  if (state[i] !== 0) return state[i];
  return filterActive && mask[i] === 0 ? 1 : 0;
}

/**
 * Merge changed indices into few upload ranges: neighbours closer than `maxGap` share a range.
 * Returns [start, count] pairs; many scattered indices collapse to a handful of uploads.
 */
export function toUpdateRanges(indices: number[], maxGap = 512, maxRanges = 32): [number, number][] {
  if (indices.length === 0) return [];
  const sorted = Int32Array.from(indices).sort();
  let ranges: [number, number][] = [];
  let s = sorted[0];
  let e = sorted[0];
  for (let k = 1; k < sorted.length; k++) {
    const i = sorted[k];
    if (i - e <= maxGap) e = i;
    else {
      ranges.push([s, e - s + 1]);
      s = e = i;
    }
  }
  ranges.push([s, e - s + 1]);
  if (ranges.length > maxRanges) ranges = [[sorted[0], sorted[sorted.length - 1] - sorted[0] + 1]];
  return ranges;
}
