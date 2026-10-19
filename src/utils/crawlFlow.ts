import type { CrawlBatch } from '../types/crawl';

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
