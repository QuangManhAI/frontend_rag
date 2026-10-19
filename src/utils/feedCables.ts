import type { Crate, GroundLayout, Vec3 } from '../types/world';
import { resamplePolyline } from './flight';
import { cellToWorld, crateHeight } from './groundLayout';

/** Uniform arrays in the cable / block shaders are sized for this many zones. */
export const MAX_ZONES = 16;
export const CABLE_SAMPLES = 48;
/** Top face of the knowledge blocks (just under the ground tiles, where the roots start). */
export const BLOCK_TOP_Y = -2;
/** Cables start this deep, far enough out to leave the bottom of the overview frame. */
export const CABLE_FAR_Y = -150;
/** The particle streams fade in over this first fraction of the cable. */
export const CABLE_FADE = 0.25;
/** The last part of a cable that follows its block when the block grows (see `liftAt`). */
const LIFT_FROM = 0.55;

/** One contiguous patch of crates of the same category: a single glass block, one cable. */
export interface Zone {
  /** Position in the shader uniform arrays. */
  index: number;
  category_index: number;
  crates: Crate[];
  /** Cell keys `col,row` of the zone (for the block outline). */
  cells: Set<string>;
  /** Where the cable plugs in: centre of the zone cell nearest the zone centroid. */
  plug: readonly [number, number];
  /** Papers at load time. */
  papers: number;
}

const key = (c: number, r: number) => `${c},${r}`;

export function zonesOf(ground: GroundLayout): Zone[] {
  const byCat = new Map<number, Crate[]>();
  for (const c of ground.crates) {
    const list = byCat.get(c.category_index);
    if (list) list.push(c);
    else byCat.set(c.category_index, [c]);
  }
  return [...byCat]
    .sort((a, b) => a[0] - b[0])
    .slice(0, MAX_ZONES)
    .map(([cat, crates], index) => {
      const centers = crates.map((c) => cellToWorld(c.cell, ground.grid_size, ground.tile_size));
      const cx = centers.reduce((s, p) => s + p[0], 0) / centers.length;
      const cz = centers.reduce((s, p) => s + p[2], 0) / centers.length;
      let best = 0;
      for (let i = 1; i < centers.length; i++) {
        if (Math.hypot(centers[i][0] - cx, centers[i][2] - cz) < Math.hypot(centers[best][0] - cx, centers[best][2] - cz)) best = i;
      }
      return {
        index,
        category_index: cat,
        crates,
        cells: new Set(crates.map((c) => key(c.cell[0], c.cell[1]))),
        plug: [centers[best][0], centers[best][2]] as const,
        papers: crates.reduce((s, c) => s + c.paper_count, 0),
      };
    });
}

/** Block depth ∝ sqrt(papers of the zone, crawled ones included). */
export function zoneHeight(papers: number, maxPapers: number): number {
  return crateHeight(papers, maxPapers, 5, 16);
}

/**
 * Current block depths (crawled papers per crate in `extra`), written into `out`. The scale leaves
 * headroom (×1.6) so even the biggest zone keeps growing while papers are crawled.
 */
export function zoneHeights(zones: readonly Zone[], extra: ReadonlyMap<number, number>, out: Float32Array): Float32Array {
  const max = 1.6 * Math.max(1, ...zones.map((z) => z.papers));
  for (const z of zones) {
    let papers = z.papers;
    for (const c of z.crates) papers += extra.get(c.id) ?? 0;
    out[z.index] = zoneHeight(papers, max);
  }
  return out;
}

function cubic(a: Vec3, b: Vec3, c: Vec3, d: Vec3, t: number): Vec3 {
  const u = 1 - t;
  const w0 = u * u * u;
  const w1 = 3 * u * u * t;
  const w2 = 3 * u * t * t;
  const w3 = t * t * t;
  return [w0 * a[0] + w1 * b[0] + w2 * c[0] + w3 * d[0], w0 * a[1] + w1 * b[1] + w2 * c[1] + w3 * d[1], w0 * a[2] + w1 * b[2] + w2 * c[2] + w3 * d[2]];
}

/** Horizontal direction the overview camera looks from: cables also lean out toward it. */
const VIEW_BIAS: readonly [number, number] = [0.5, 0.87];

/**
 * A fan-shaped cable: starts deep and far out (radially from the trunk, leaning toward the overview
 * camera so it leaves the bottom of the frame), sweeps in under the ground and plugs vertically
 * into the bottom of its block at `bottomY`. Evenly spaced by arc length.
 */
export function cablePath(zone: Zone, bottomY: number, samples = CABLE_SAMPLES): Vec3[] {
  const [px, pz] = zone.plug;
  const r = Math.hypot(px, pz);
  const ang = zone.category_index * 2.39996;
  const dx = r > 1 ? px / r : Math.cos(ang);
  const dz = r > 1 ? pz / r : Math.sin(ang);
  const reach = 55 + r * 1.2;
  const start: Vec3 = [px + dx * reach + VIEW_BIAS[0] * 45, CABLE_FAR_Y, pz + dz * reach + VIEW_BIAS[1] * 45];
  const c1: Vec3 = [start[0] + (px - start[0]) * 0.2, CABLE_FAR_Y + (bottomY - CABLE_FAR_Y) * 0.45, start[2] + (pz - start[2]) * 0.2];
  const c2: Vec3 = [px, bottomY - 30, pz];
  // The curve ends a little below the block, then a straight vertical run plugs in.
  const knee: Vec3 = [px, bottomY - 9, pz];
  const dense: Vec3[] = [];
  for (let i = 0; i <= 240; i++) dense.push(cubic(start, c1, c2, knee, i / 240));
  dense.push([px, bottomY, pz]);
  return resamplePolyline(dense, samples);
}

/** How much of a block's growth `dy` moves the cable at parameter t (0 below LIFT_FROM, 1 at the plug). */
export function liftAt(t: number): number {
  const x = Math.min(1, Math.max(0, (t - LIFT_FROM) / (1 - LIFT_FROM)));
  return x * x * (3 - 2 * x);
}

/** The cable after its block's bottom moved by `dy`. */
export function liftPath(path: readonly Vec3[], dy: number): Vec3[] {
  const n = path.length - 1;
  return path.map((p, i) => [p[0], p[1] + dy * liftAt(n === 0 ? 1 : i / n), p[2]] as const);
}

export interface BlockArrays {
  /** (x, depth, z): depth 0 = top face, 1 = bottom face; the shader sets y from the zone height. */
  position: Float32Array;
  normal: Float32Array;
  zone: Float32Array;
  /** 0 top, 1 bottom, 2 side. */
  face: Float32Array;
  index: Uint32Array;
  /** Outline: line-segment endpoints (x, depth, z) and their zone. */
  edges: Float32Array;
  edgeZone: Float32Array;
}

const DIRS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * One closed prism per zone, extruded from the union of its cells: no inner walls, so the zone
 * reads as one block. Outer walls are inset slightly so neighbouring zones never share a face.
 */
export function buildBlocks(zones: readonly Zone[], ground: GroundLayout, inset = 0.12): BlockArrays {
  const pos: number[] = [];
  const nor: number[] = [];
  const zon: number[] = [];
  const fac: number[] = [];
  const idx: number[] = [];
  const edges: number[] = [];
  const edgeZone: number[] = [];
  const ts = ground.tile_size;
  const half = ts / 2;
  const quad = (p: number[][], n: readonly [number, number, number], zi: number, face: number) => {
    const b = pos.length / 3;
    for (const q of p) {
      pos.push(q[0], q[1], q[2]);
      nor.push(n[0], n[1], n[2]);
      zon.push(zi);
      fac.push(face);
    }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  };
  const edge = (a: number[], b: number[], zi: number) => {
    edges.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    edgeZone.push(zi, zi);
  };

  for (const z of zones) {
    const has = (c: number, r: number) => z.cells.has(key(c, r));
    const corners = new Set<string>();
    for (const crate of z.crates) {
      const [c, r] = crate.cell;
      const [x, , zc] = cellToWorld(crate.cell, ground.grid_size, ts);
      const open = (dc: number, dr: number) => !has(c + dc, r + dr);
      const x0 = x - half + (open(-1, 0) ? inset : 0);
      const x1 = x + half - (open(1, 0) ? inset : 0);
      const z0 = zc - half + (open(0, -1) ? inset : 0);
      const z1 = zc + half - (open(0, 1) ? inset : 0);
      quad([[x0, 0, z0], [x0, 0, z1], [x1, 0, z1], [x1, 0, z0]], [0, 1, 0], z.index, 0);
      quad([[x0, 1, z0], [x1, 1, z0], [x1, 1, z1], [x0, 1, z1]], [0, -1, 0], z.index, 1);

      for (const [dc, dr] of DIRS) {
        if (!open(dc, dr)) continue;
        // The wall runs along the other axis; each end is shortened (convex corner), kept
        // (the wall continues in the next cell) or extended (concave corner).
        const alongX = dc === 0;
        const ends = [-1, 1].map((e) => {
          const nc = c + (alongX ? e : 0);
          const nr = r + (alongX ? 0 : e);
          if (!has(nc, nr)) return { off: -inset, corner: true };
          if (has(nc + dc, nr + dr)) return { off: inset, corner: true };
          return { off: 0, corner: false };
        });
        const w = dc !== 0 ? x + dc * (half - inset) : zc + dr * (half - inset);
        const lo = (alongX ? x : zc) - half - ends[0].off;
        const hi = (alongX ? x : zc) + half + ends[1].off;
        const at = (s: number, d: number) => (alongX ? [s, d, w] : [w, d, s]);
        // Rendered double-sided, so the winding does not matter.
        quad([at(lo, 0), at(hi, 0), at(hi, 1), at(lo, 1)], [dc, 0, dr], z.index, 2);
        edge(at(lo, 0), at(hi, 0), z.index);
        edge(at(lo, 1), at(hi, 1), z.index);
        // Vertical edges only where the outline turns (two walls meet; drawn once).
        [lo, hi].forEach((s, e) => {
          if (!ends[e].corner) return;
          const p = at(s, 0);
          const k = `${p[0].toFixed(3)},${p[2].toFixed(3)}`;
          if (corners.has(k)) return;
          corners.add(k);
          edge(p, at(s, 1), z.index);
        });
      }
    }
  }
  return {
    position: new Float32Array(pos),
    normal: new Float32Array(nor),
    zone: new Float32Array(zon),
    face: new Float32Array(fac),
    index: new Uint32Array(idx),
    edges: new Float32Array(edges),
    edgeZone: new Float32Array(edgeZone),
  };
}

/**
 * Energy pulses: per zone a ring of `slots` (start, duration) pairs (a pack of bright streaks).
 * A new pulse leaves every 1.5–3 s (phases differ per zone), much more often while the zone
 * receives papers. `update` returns the zones whose pulse just reached the block.
 */
export class PulseTrain {
  /** (start, duration) per slot, zone-major. */
  readonly pulses: Float32Array;
  private readonly next: Float64Array;
  private readonly arrived: Uint8Array;
  private readonly cursor: Uint8Array;
  private readonly hits: number[] = [];
  /** Zones that launched a pulse during the last `update`. */
  readonly started: number[] = [];

  constructor(
    readonly zones: number,
    private readonly rng: () => number,
    readonly slots = 4,
    now = 0,
  ) {
    this.pulses = new Float32Array(zones * slots * 2).fill(-1e6);
    this.next = new Float64Array(zones);
    this.arrived = new Uint8Array(zones * slots).fill(1);
    this.cursor = new Uint8Array(zones);
    for (let z = 0; z < zones; z++) this.next[z] = now + this.rng() * 3;
  }

  static interval(rand: number, activity: number): number {
    return (1.5 + rand * 1.5) / (1 + 3 * Math.min(1, Math.max(0, activity)));
  }

  /** Advance to `now`; `activity[z]` ∈ [0,1], `travel[z]` = seconds for a pulse to reach the block. */
  update(now: number, activity: ArrayLike<number>, travel: ArrayLike<number>): readonly number[] {
    this.hits.length = 0;
    this.started.length = 0;
    for (let z = 0; z < this.zones; z++) {
      if (now >= this.next[z]) {
        this.started.push(z);
        const s = this.cursor[z];
        this.cursor[z] = (s + 1) % this.slots;
        const o = (z * this.slots + s) * 2;
        this.pulses[o] = now;
        this.pulses[o + 1] = travel[z];
        this.arrived[z * this.slots + s] = 0;
        this.next[z] = now + PulseTrain.interval(this.rng(), activity[z]);
      }
      for (let s = 0; s < this.slots; s++) {
        const k = z * this.slots + s;
        if (this.arrived[k]) continue;
        if (now >= this.pulses[k * 2] + this.pulses[k * 2 + 1]) {
          this.arrived[k] = 1;
          this.hits.push(z);
        }
      }
    }
    return this.hits;
  }
}
