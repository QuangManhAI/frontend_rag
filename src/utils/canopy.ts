import { categoryColor, type ThemeTokens } from '../theme/tokens';
import type { VectorTable } from '../types/world';

/** Vector visual states, written to the `state` attribute of the canopy. */
export const VectorState = {
  normal: 0,
  dimmed: 1,
  comparing: 2,
  topK: 3,
  focused: 4,
} as const;

export interface CanopyAttributes {
  position: Float32Array;
  color: Float32Array;
  size: Float32Array;
  phase: Float32Array;
  state: Float32Array;
  year: Float32Array;
}

/** "#rrggbb" → [r,g,b] in 0..1. */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').slice(0, 6);
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Deterministic hash of an integer into [0, 1). */
export function hash01(i: number): number {
  let x = (i | 0) + 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

export function pointSize(authority: number): number {
  const a = Math.min(1, Math.max(0, authority));
  return 0.6 + (1.8 - 0.6) * Math.sqrt(a);
}

/** Per-point colors for a theme (also used when only the theme changes). */
export function buildCanopyColors(vectors: VectorTable, theme: ThemeTokens, out: Float32Array = new Float32Array(vectors.count * 3)): Float32Array {
  const cache = new Map<number, [number, number, number]>();
  for (let i = 0; i < vectors.count; i++) {
    const c = vectors.categories[i];
    let rgb = cache.get(c);
    if (!rgb) {
      rgb = hexToRgb(categoryColor(c, theme));
      cache.set(c, rgb);
    }
    out[i * 3] = rgb[0];
    out[i * 3 + 1] = rgb[1];
    out[i * 3 + 2] = rgb[2];
  }
  return out;
}

export function buildCanopyAttributes(vectors: VectorTable, theme: ThemeTokens): CanopyAttributes {
  const size = new Float32Array(vectors.count);
  const phase = new Float32Array(vectors.count);
  const year = new Float32Array(vectors.count);
  for (let i = 0; i < vectors.count; i++) {
    size[i] = pointSize(vectors.authority[i]);
    phase[i] = hash01(i);
    year[i] = vectors.years[i];
  }
  return {
    position: vectors.positions,
    color: buildCanopyColors(vectors, theme),
    size,
    phase,
    state: new Float32Array(vectors.count),
    year,
  };
}

/** Write changed states only; returns the touched [min, max] index range or null. */
export function applyStates(stateAttr: Float32Array, changes: ReadonlyMap<number, number>): [number, number] | null {
  let min = Infinity;
  let max = -Infinity;
  for (const [i, s] of changes) {
    if (i < 0 || i >= stateAttr.length || stateAttr[i] === s) continue;
    stateAttr[i] = s;
    if (i < min) min = i;
    if (i > max) max = i;
  }
  return min === Infinity ? null : [min, max];
}

/** Desired state per index from the filter (highlights) and the flight overlay. */
export function diffStates(
  current: Float32Array,
  highlights: Uint32Array | null,
  overlay: ReadonlyMap<number, number>,
): Map<number, number> {
  const desired = new Float32Array(current.length);
  if (highlights) {
    desired.fill(VectorState.dimmed);
    for (let k = 0; k < highlights.length; k++) desired[highlights[k]] = VectorState.normal;
  }
  for (const [i, s] of overlay) if (i >= 0 && i < desired.length) desired[i] = s;
  const changes = new Map<number, number>();
  for (let i = 0; i < current.length; i++) if (current[i] !== desired[i]) changes.set(i, desired[i]);
  return changes;
}
