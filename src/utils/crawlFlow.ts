import type { CrawlBatch } from '../types/crawl';
import type { Crate, GroundLayout, Vec3 } from '../types/world';
import { cellToWorld } from './groundLayout';

/** Depth of the glowing "knowledge source" layer the streams rise from. */
export const SOURCE_Y = -40;
export const PATH_SAMPLES = 16;

export interface ZoneColumn {
  category_index: number;
  /** Centroid of the zone's crates on the ground plane. */
  x: number;
  z: number;
  /** Radius of the zone (farthest crate center + half a tile). */
  radius: number;
  /** Bottom of the deepest crate in the zone (the column ends just under it). */
  bottom: number;
  crateIds: number[];
}

/**
 * One vertical column per category zone: crates of a category form a contiguous patch on the
 * ground, so the stream for that category rises straight up from the source layer under the patch.
 */
export function zoneColumns(ground: GroundLayout, heightOf: (crate: Crate) => number): ZoneColumn[] {
  const byCat = new Map<number, Crate[]>();
  for (const c of ground.crates) {
    const list = byCat.get(c.category_index);
    if (list) list.push(c);
    else byCat.set(c.category_index, [c]);
  }
  const out: ZoneColumn[] = [];
  for (const [cat, crates] of [...byCat].sort((a, b) => a[0] - b[0])) {
    const centers = crates.map((c) => cellToWorld(c.cell, ground.grid_size, ground.tile_size));
    const x = centers.reduce((s, p) => s + p[0], 0) / centers.length;
    const z = centers.reduce((s, p) => s + p[2], 0) / centers.length;
    const radius = Math.max(...centers.map((p) => Math.hypot(p[0] - x, p[2] - z))) + ground.tile_size / 2;
    const bottom = -2 - Math.max(...crates.map(heightOf));
    out.push({ category_index: cat, x, z, radius, bottom, crateIds: crates.map((c) => c.id) });
  }
  return out;
}

/** Straight vertical path from the source layer up to the bottom of the zone's crates. */
export function columnPath(col: ZoneColumn, samples = PATH_SAMPLES): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    out.push([col.x, SOURCE_Y + (col.bottom - SOURCE_Y) * t, col.z]);
  }
  return out;
}

/** Merges batches per (stage, crate) inside a time window (the caller flushes every 250 ms). */
export class BatchAggregator {
  private buckets = new Map<string, CrawlBatch>();

  add(batch: CrawlBatch): void {
    const key = `${batch.stage}:${batch.crate_id}`;
    const b = this.buckets.get(key);
    if (b) b.count += batch.count;
    else this.buckets.set(key, { ...batch });
  }

  flush(): CrawlBatch[] {
    const out = [...this.buckets.values()];
    this.buckets.clear();
    return out;
  }

  get size(): number {
    return this.buckets.size;
  }
}

export type FlowQuality = 'high' | 'low';
const K: Record<FlowQuality, number> = { high: 22, low: 8 };
const MAX_PER_FLUSH: Record<FlowQuality, number> = { high: 120, low: 30 };
export const POOL_SIZE: Record<FlowQuality, number> = { high: 20_000, low: 5_000 };

/** Particles for a merged batch: grows with log(count), at least 1, capped per flush. */
export function particlesFor(count: number, quality: FlowQuality): number {
  const n = Math.round(Math.log2(1 + Math.max(0, count)) * K[quality]);
  return Math.min(MAX_PER_FLUSH[quality], Math.max(1, n));
}

/**
 * Fixed-size slot allocator. Slots are handed out round-robin, so once the pool is full the next
 * slot is always the one emitted longest ago (the oldest particle is replaced, size never grows).
 */
export class ParticlePool {
  private next = 0;
  private emitted = 0;

  constructor(readonly size: number) {}

  emit(): number {
    const slot = this.next;
    this.next = (this.next + 1) % this.size;
    this.emitted++;
    return slot;
  }

  /** Slots in use (never above `size`). */
  get used(): number {
    return Math.min(this.emitted, this.size);
  }

  get total(): number {
    return this.emitted;
  }
}
