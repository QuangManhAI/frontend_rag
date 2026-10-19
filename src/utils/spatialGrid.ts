/**
 * Uniform spatial hash over the canopy points (built once) so a hover ray only tests the points
 * in cells it passes near, instead of all 150k. Hit semantics match THREE.Points.raycast:
 * a point hits when its distance to the ray ≤ threshold and its projection lies in [near, far].
 */
export interface PointGrid {
  cellSize: number;
  min: [number, number, number];
  dims: [number, number, number];
  /** CSR layout: points of cell c are items[start[c] .. start[c + 1]). */
  start: Uint32Array;
  items: Uint32Array;
  positions: Float32Array;
  /** Per-cell "visited in query #n" stamp, reused across queries (no allocation per query). */
  stamp: Uint32Array;
  query: number;
}

export interface RayHit {
  index: number;
  /** Distance from the ray origin to the closest point on the ray (THREE's `distance`). */
  distance: number;
  distanceToRay: number;
}

export function buildPointGrid(positions: Float32Array, cellSize = 3): PointGrid {
  const n = positions.length / 3;
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < 3; a++) {
      const v = positions[i * 3 + a];
      if (v < min[a]) min[a] = v;
      if (v > max[a]) max[a] = v;
    }
  }
  if (n === 0) min.fill(0), max.fill(0);
  const dims: [number, number, number] = [0, 1, 2].map((a) => Math.max(1, Math.floor((max[a] - min[a]) / cellSize) + 1)) as [number, number, number];
  const cells = dims[0] * dims[1] * dims[2];
  const cellOf = new Uint32Array(n);
  const count = new Uint32Array(cells + 1);
  for (let i = 0; i < n; i++) {
    const cx = Math.min(dims[0] - 1, Math.floor((positions[i * 3] - min[0]) / cellSize));
    const cy = Math.min(dims[1] - 1, Math.floor((positions[i * 3 + 1] - min[1]) / cellSize));
    const cz = Math.min(dims[2] - 1, Math.floor((positions[i * 3 + 2] - min[2]) / cellSize));
    const c = (cz * dims[1] + cy) * dims[0] + cx;
    cellOf[i] = c;
    count[c + 1]++;
  }
  for (let c = 0; c < cells; c++) count[c + 1] += count[c];
  const start = count;
  const fill = start.slice(0, cells);
  const items = new Uint32Array(n);
  for (let i = 0; i < n; i++) items[fill[cellOf[i]]++] = i;
  return { cellSize, min, dims, start, items, positions, stamp: new Uint32Array(cells), query: 0 };
}

/**
 * All hits of a ray against the grid (unsorted, appended to `out`, which is cleared first).
 * Walks the cells pierced by the ray with a 3D DDA and also visits the neighbours within
 * `threshold`, so points just beside the ray are not missed.
 */
export function raycastGrid(
  g: PointGrid,
  origin: readonly [number, number, number],
  dir: readonly [number, number, number],
  threshold: number,
  near: number,
  far: number,
  out: RayHit[],
): RayHit[] {
  out.length = 0;
  if (++g.query === 0xffffffff) {
    g.stamp.fill(0);
    g.query = 1;
  }
  const q = g.query;
  const cs = g.cellSize;
  const [dx, dy, dz] = dir;
  const pad = threshold;
  // Clip the ray to the grid box grown by the threshold.
  let t0 = Math.max(0, near);
  let t1 = far;
  for (let a = 0; a < 3; a++) {
    const o = origin[a];
    const d = dir[a];
    const lo = g.min[a] - pad;
    const hi = g.min[a] + g.dims[a] * cs + pad;
    if (Math.abs(d) < 1e-12) {
      if (o < lo || o > hi) return out;
      continue;
    }
    let ta = (lo - o) / d;
    let tb = (hi - o) / d;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return out;
  }
  const r = Math.ceil(threshold / cs);
  const thr2 = threshold * threshold;
  const p = g.positions;
  const visitCell = (cx: number, cy: number, cz: number) => {
    for (let z = cz - r; z <= cz + r; z++) {
      if (z < 0 || z >= g.dims[2]) continue;
      for (let y = cy - r; y <= cy + r; y++) {
        if (y < 0 || y >= g.dims[1]) continue;
        for (let x = cx - r; x <= cx + r; x++) {
          if (x < 0 || x >= g.dims[0]) continue;
          const c = (z * g.dims[1] + y) * g.dims[0] + x;
          if (g.stamp[c] === q) continue;
          g.stamp[c] = q;
          for (let k = g.start[c]; k < g.start[c + 1]; k++) {
            const i = g.items[k];
            const vx = p[i * 3] - origin[0];
            const vy = p[i * 3 + 1] - origin[1];
            const vz = p[i * 3 + 2] - origin[2];
            const t = Math.max(0, vx * dx + vy * dy + vz * dz);
            const ex = vx - dx * t;
            const ey = vy - dy * t;
            const ez = vz - dz * t;
            const d2 = ex * ex + ey * ey + ez * ez;
            if (d2 > thr2 || t < near || t > far) continue;
            out.push({ index: i, distance: t, distanceToRay: Math.sqrt(d2) });
          }
        }
      }
    }
  };
  // 3D DDA (Amanatides & Woo) from t0 to t1.
  const cell = [0, 0, 0];
  const step = [0, 0, 0];
  const tMax = [0, 0, 0];
  const tDelta = [0, 0, 0];
  for (let a = 0; a < 3; a++) {
    const pos = origin[a] + dir[a] * t0;
    cell[a] = Math.min(g.dims[a] - 1, Math.max(0, Math.floor((pos - g.min[a]) / cs)));
    if (dir[a] > 0) {
      step[a] = 1;
      tMax[a] = t0 + (g.min[a] + (cell[a] + 1) * cs - pos) / dir[a];
      tDelta[a] = cs / dir[a];
    } else if (dir[a] < 0) {
      step[a] = -1;
      tMax[a] = t0 + (g.min[a] + cell[a] * cs - pos) / dir[a];
      tDelta[a] = -cs / dir[a];
    } else {
      step[a] = 0;
      tMax[a] = Infinity;
      tDelta[a] = Infinity;
    }
  }
  let t = t0;
  // Cells just outside the box can still hold neighbours within the threshold: clamp, don't stop.
  for (let guard = 0; guard < 4096 && t <= t1; guard++) {
    visitCell(cell[0], cell[1], cell[2]);
    const a = tMax[0] < tMax[1] ? (tMax[0] < tMax[2] ? 0 : 2) : tMax[1] < tMax[2] ? 1 : 2;
    t = tMax[a];
    tMax[a] += tDelta[a];
    cell[a] += step[a];
    if (cell[a] < -r || cell[a] >= g.dims[a] + r) break;
  }
  return out;
}

/** Same choice as before: among the 64 nearest hits (by distance), the one closest to the ray. */
export function pickNearest(hits: RayHit[], accept: (index: number) => boolean): number | null {
  hits.sort((a, b) => a.distance - b.distance);
  let best: number | null = null;
  let bestRay = Infinity;
  const n = Math.min(64, hits.length);
  for (let k = 0; k < n; k++) {
    const h = hits[k];
    if (!accept(h.index)) continue;
    if (h.distanceToRay < bestRay) {
      bestRay = h.distanceToRay;
      best = h.index;
    }
  }
  return best;
}
