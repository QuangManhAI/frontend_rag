import type { CrawlStreamEvent, CrawlVectorItem } from '../../types/crawl';
import type { TreeNode } from '../../types/world';
import type { MockContext } from './mockChat';
import { gauss, mulberry32, pickWeighted } from './rng';

/** Live knobs of the mock crawler (dev toolbar in the HUD). */
export interface MockCrawlControl {
  running: boolean;
  ratePerMin: number;
  /** Simulate a dropped backend: the stream throws so the client reconnects. */
  offline: boolean;
}

export const MOCK_CRAWL_TARGET = 150_000;
const MAX_VECTORS_PER_EVENT = 50;

/**
 * Deterministic crawl simulator consistent with the mock world: papers arrive at `ratePerMin`,
 * spread over categories by their paper_count, land in a crate of their category, get embedded
 * ~1–2 s later and receive a position around a twig of the same category.
 */
export class MockCrawler {
  fetched: number;
  embedded: number;
  readonly target: number;
  private t = 0;
  private acc = 0;
  private seq = 0;
  private statusAt = 0;
  private wasRunning = false;
  private readonly startedAt = new Date().toISOString();
  private readonly rng: () => number;
  private readonly queue: { due: number; crate: number; cat: number; count: number }[] = [];
  private readonly cratesByCat: number[][];
  private readonly twigsByCat: TreeNode[][];
  private readonly twigs: TreeNode[];
  private readonly weights: number[];

  constructor(
    private readonly ctx: MockContext,
    seed = 99,
    target = MOCK_CRAWL_TARGET,
  ) {
    this.rng = mulberry32(seed);
    const { world } = ctx;
    this.fetched = this.embedded = world.vectors.count;
    // Always leave something to crawl, even for a big (e.g. 150k) mock world.
    this.target = Math.max(target, world.vectors.count + 120_000);
    this.weights = world.categories.map((c) => c.paper_count);
    this.cratesByCat = world.categories.map((c) => world.ground.crates.filter((k) => k.category_index === c.index).map((k) => k.id));
    this.twigs = world.tree.filter((n) => n.depth === 2);
    this.twigsByCat = world.categories.map((c) => this.twigs.filter((t) => t.dominant_category === c.index));
  }

  /** Advance simulated time by `dt` seconds; returns the events to emit. */
  tick(dt: number, control: MockCrawlControl): CrawlStreamEvent[] {
    const out: CrawlStreamEvent[] = [];
    this.t += dt;
    const running = control.running && this.embedded < this.target;
    if (running && this.fetched < this.target) {
      this.acc += (control.ratePerMin / 60) * dt;
      let n = Math.min(Math.floor(this.acc), this.target - this.fetched);
      this.acc -= Math.floor(this.acc);
      while (n > 0) {
        const size = Math.min(n, 1 + Math.floor(this.rng() * 6));
        const cat = pickWeighted(this.rng, this.weights);
        const crates = this.cratesByCat[cat];
        if (crates.length === 0) break;
        const crate = crates[Math.floor(this.rng() * crates.length)];
        out.push({ type: 'crawl_batch', stage: 'fetched', crate_id: crate, category_index: cat, count: size });
        this.queue.push({ due: this.t + 1 + this.rng(), crate, cat, count: size });
        this.fetched += size;
        n -= size;
      }
    }
    // Embedding finishes ~1–2 s after fetching (keeps going briefly after a pause).
    const items: CrawlVectorItem[] = [];
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const q = this.queue[i];
      if (q.due > this.t) continue;
      this.queue.splice(i, 1);
      out.push({ type: 'crawl_batch', stage: 'embedded', crate_id: q.crate, category_index: q.cat, count: q.count });
      this.embedded += q.count;
      for (let k = 0; k < q.count; k++) items.push(this.makeVector(q.crate, q.cat));
    }
    for (let i = 0; i < items.length; i += MAX_VECTORS_PER_EVENT) out.push({ type: 'crawl_vectors', items: items.slice(i, i + MAX_VECTORS_PER_EVENT) });

    const active = running || this.queue.length > 0;
    if (this.t - this.statusAt >= 2 || active !== this.wasRunning) {
      this.statusAt = this.t;
      out.push(this.status(active, control.ratePerMin));
    }
    if (this.wasRunning && !active && this.embedded >= this.target) out.push({ type: 'crawl_done', fetched: this.fetched, embedded: this.embedded });
    this.wasRunning = active;
    return out;
  }

  status(running: boolean, rate: number): CrawlStreamEvent {
    return { type: 'crawl_status', running, target: this.target, fetched: this.fetched, embedded: this.embedded, rate_per_min: running ? rate : 0, started_at: this.startedAt };
  }

  private makeVector(crate: number, cat: number): CrawlVectorItem {
    const pool = this.twigsByCat[cat].length > 0 ? this.twigsByCat[cat] : this.twigs;
    const twig = pool[Math.floor(this.rng() * pool.length)];
    let id: string;
    do id = `2610.${String(60000 + this.seq++).padStart(5, '0')}`;
    while (this.ctx.indexByPaperId.has(id));
    const R = 4.5;
    return {
      paper_id: id,
      position: [twig.position[0] + gauss(this.rng) * R * 0.5, Math.min(112, Math.max(40, twig.position[1] + gauss(this.rng) * R * 0.3 + 1.5)), twig.position[2] + gauss(this.rng) * R * 0.5],
      twig_id: twig.id,
      crate_id: crate,
      category_index: cat,
      year: 2026,
      authority: Math.pow(this.rng(), 4),
    };
  }
}

/** Stream adapter used by crawlClient in mock mode: 250 ms ticks; throws while "offline". */
export async function* mockCrawlStream(crawler: MockCrawler, control: MockCrawlControl, signal: AbortSignal, tickMs = 250): AsyncGenerator<CrawlStreamEvent> {
  yield crawler.status(false, 0);
  let last = performance.now();
  while (!signal.aborted) {
    await new Promise((r) => setTimeout(r, tickMs));
    if (signal.aborted) return;
    if (control.offline) throw new Error('Mock: mất kết nối tới backend (giả lập)');
    const now = performance.now();
    const dt = Math.min(1, (now - last) / 1000);
    last = now;
    for (const ev of crawler.tick(dt, control)) yield ev;
  }
}
