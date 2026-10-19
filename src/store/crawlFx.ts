import type { CrawlBatch, CrawlVectorItem } from '../types/crawl';

/** Shared clock for crawl visuals and canopy "birth" animation (seconds). */
export const nowSec = (): number => performance.now() / 1000;

/** Seconds a particle takes to rise from a crate up its root to the twig. */
export const RISE_DURATION = 2.6;

/**
 * Mutable crawl visual state, read inside useFrame (never React state per event):
 * extra papers per crate (crate heights), arrival flashes (crate + ground tile glow), pending
 * arrivals scheduled by the particle streams, and the time the last particle lands.
 */
export const crawlFx = {
  /** crate id → papers added since load (drives crate height). */
  extra: new Map<number, number>(),
  /** crate id → time of the last arrival (glow fades over ~1 s). */
  flash: new Map<number, number>(),
  /** category index → last time a stream of it was emitted (HUD dots). */
  flowing: new Map<number, number>(),
  pending: [] as { at: number; crate: number; count: number }[],
  /** Bumped when heights changed (BookCrates re-applies matrices, ≤ 4×/s). */
  heightVersion: 0,
  /** When the last scheduled particle lands. */
  lastEnd: 0,
  /** Set by the mounted stream / rise components. */
  streamsLive: false,
  /** Particle slots in use by the stream pool (perf audits). */
  poolUsed: 0,
  riseLive: false,
};

export function scheduleArrival(crate: number, count: number, at: number): void {
  crawlFx.pending.push({ at, crate, count });
  if (at > crawlFx.lastEnd) crawlFx.lastEnd = at;
}

/** Apply arrivals that are due: grow crates and flash them. Called on a 250 ms timer. */
export function applyDueArrivals(t: number): number {
  let applied = 0;
  for (let i = crawlFx.pending.length - 1; i >= 0; i--) {
    const p = crawlFx.pending[i];
    if (p.at > t) continue;
    crawlFx.pending.splice(i, 1);
    crawlFx.extra.set(p.crate, (crawlFx.extra.get(p.crate) ?? 0) + p.count);
    crawlFx.flash.set(p.crate, t);
    applied++;
  }
  if (applied > 0) crawlFx.heightVersion++;
  // Flashes last ~1.2 s; drop old entries so per-frame loops stay short.
  for (const [crate, at] of crawlFx.flash) if (t - at > 1.6) crawlFx.flash.delete(crate);
  return applied;
}

type BatchListener = (b: CrawlBatch) => void;
type VectorsListener = (items: readonly CrawlVectorItem[], born: number) => void;

/** Event fan-out from crawlStore to the mounted 3D effects. */
export const crawlBus = {
  batch: new Set<BatchListener>(),
  vectors: new Set<VectorsListener>(),
};
