import type { CompareCandidate, RouteStep } from '../types/rag';
import type { TreeNode, VectorTable, Vec3 } from '../types/world';

/** Where the query orb is born, above the canopy (Mục 3.1). */
export const QUERY_ORIGIN: Vec3 = [0, 125, 0];

export function polylineLength(points: readonly Vec3[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) len += dist(points[i - 1], points[i]);
  return len;
}

/** Point at arc-length fraction t ∈ [0,1] of a polyline. */
export function samplePolyline(points: readonly Vec3[], t: number): Vec3 {
  if (points.length === 0) return [0, 0, 0];
  if (points.length === 1 || t <= 0) return points[0];
  if (t >= 1) return points[points.length - 1];
  const target = polylineLength(points) * t;
  let walked = 0;
  for (let i = 1; i < points.length; i++) {
    const seg = dist(points[i - 1], points[i]);
    if (walked + seg >= target) {
      const f = seg === 0 ? 0 : (target - walked) / seg;
      return lerp3(points[i - 1], points[i], f);
    }
    walked += seg;
  }
  return points[points.length - 1];
}

/** Evenly re-sample a polyline into `count` points by arc length. */
export function resamplePolyline(points: readonly Vec3[], count: number): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i < count; i++) out.push(samplePolyline(points, count === 1 ? 0 : i / (count - 1)));
  return out;
}

/** One flight path per (chosen branch, chosen twig of that branch). */
export function buildFlightPaths(route: readonly RouteStep[], nodesById: ReadonlyMap<number, TreeNode>): Vec3[][] {
  const root = nodesById.get(0);
  if (!root) return [];
  const branches = route.find((s) => s.depth === 1)?.chosen ?? [];
  const twigs = route.find((s) => s.depth === 2)?.chosen ?? [];
  const aboveRoot: Vec3 = [root.position[0], root.position[1] + 10, root.position[2]];
  const paths: Vec3[][] = [];
  for (const b of branches) {
    const branch = nodesById.get(b);
    if (!branch) continue;
    const own = twigs.filter((t) => nodesById.get(t)?.parent_id === b);
    if (own.length === 0) {
      paths.push([QUERY_ORIGIN, aboveRoot, branch.position]);
      continue;
    }
    for (const t of own) {
      const twig = nodesById.get(t);
      if (twig) paths.push([QUERY_ORIGIN, aboveRoot, branch.position, twig.position]);
    }
  }
  return paths;
}

/** A compare stop: the candidate, its vector index and position. */
export interface TourStop {
  paper_id: string;
  score: number;
  index: number;
  position: Vec3;
}

/** Stops in score order; candidates without a vector are skipped with a warning. */
export function buildCompareTour(
  candidates: readonly CompareCandidate[],
  vectors: VectorTable,
  indexByPaperId: ReadonlyMap<string, number>,
): TourStop[] {
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const stops: TourStop[] = [];
  for (const c of sorted) {
    const index = indexByPaperId.get(c.paper_id);
    if (index === undefined) {
      console.warn(`[flight] compare candidate ${c.paper_id} has no vector — skipped`);
      continue;
    }
    stops.push({ paper_id: c.paper_id, score: c.score, index, position: vectorPosition(vectors, index) });
  }
  return stops;
}

/** Dwell per compare stop: slow at first, faster towards the end. */
export function compareDwell(i: number, total: number, first = 0.35, last = 0.06): number {
  return first + (last - first) * (i / Math.max(1, total - 1));
}

export function vectorPosition(vectors: VectorTable, index: number): Vec3 {
  const p = vectors.positions;
  return [p[index * 3], p[index * 3 + 1], p[index * 3 + 2]];
}

export function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function dist(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function easeInOut(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}
