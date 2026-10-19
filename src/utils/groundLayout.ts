import type { VectorTable, Vec3 } from '../types/world';

/** Center of a grid cell on the ground plane (y = 0). */
export function cellToWorld(cell: readonly [number, number], gridSize: readonly [number, number], tileSize: number): Vec3 {
  const [col, row] = cell;
  const [cols, rows] = gridSize;
  return [(col - (cols - 1) / 2) * tileSize, 0, (row - (rows - 1) / 2) * tileSize];
}

/** Crate height grows with sqrt(paper_count), clamped to [minH, maxH]. */
export function crateHeight(paperCount: number, maxCount: number, minH = 2, maxH = 12): number {
  if (maxCount <= 0) return minH;
  const f = Math.min(1, Math.max(0, paperCount / maxCount));
  return minH + (maxH - minH) * Math.sqrt(f);
}

function groupBy(values: ArrayLike<number>): Map<number, Uint32Array> {
  const counts = new Map<number, number>();
  for (let i = 0; i < values.length; i++) counts.set(values[i], (counts.get(values[i]) ?? 0) + 1);
  const out = new Map<number, Uint32Array>();
  const fill = new Map<number, number>();
  for (const [k, n] of counts) {
    out.set(k, new Uint32Array(n));
    fill.set(k, 0);
  }
  for (let i = 0; i < values.length; i++) {
    const k = values[i];
    const at = fill.get(k) ?? 0;
    const arr = out.get(k);
    if (arr) arr[at] = i;
    fill.set(k, at + 1);
  }
  return out;
}

/** Vector indices per crate id (computed once, then cached by the caller). */
export function groupVectorsByCrate(vectors: VectorTable): Map<number, Uint32Array> {
  return groupBy(vectors.crateIds);
}

/** Vector indices per category index. */
export function groupVectorsByCategory(vectors: VectorTable): Map<number, Uint32Array> {
  return groupBy(vectors.categories);
}
