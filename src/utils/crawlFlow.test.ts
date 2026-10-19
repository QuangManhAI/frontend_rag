import { describe, expect, it } from 'vitest';
import { BatchAggregator, ParticlePool, particlesFor, POOL_SIZE } from './crawlFlow';

describe('BatchAggregator', () => {
  it('merges per (stage, crate) within a window', () => {
    const agg = new BatchAggregator();
    agg.add({ stage: 'fetched', crate_id: 12, category_index: 1, count: 4 });
    agg.add({ stage: 'fetched', crate_id: 12, category_index: 1, count: 6 });
    agg.add({ stage: 'fetched', crate_id: 40, category_index: 2, count: 2 });
    agg.add({ stage: 'embedded', crate_id: 12, category_index: 1, count: 3 });
    const out = agg.flush();
    expect(out).toHaveLength(3);
    expect(out.find((b) => b.stage === 'fetched' && b.crate_id === 12)).toMatchObject({ count: 10, category_index: 1 });
    expect(out.find((b) => b.crate_id === 40)).toMatchObject({ count: 2, category_index: 2 });
    expect(agg.flush()).toEqual([]);
  });

  it('does not mutate the added batch objects', () => {
    const agg = new BatchAggregator();
    const b = { stage: 'fetched' as const, crate_id: 1, category_index: 0, count: 1 };
    agg.add(b);
    agg.add(b);
    expect(b.count).toBe(1);
    expect(agg.flush()[0].count).toBe(2);
  });
});

describe('particlesFor', () => {
  it('is at least 1, grows with count and never exceeds the per-flush cap', () => {
    expect(particlesFor(0, 'high')).toBe(1);
    expect(particlesFor(10, 'high')).toBeGreaterThan(particlesFor(1, 'high'));
    expect(particlesFor(1e9, 'high')).toBe(120);
    expect(particlesFor(1e9, 'low')).toBe(30);
    expect(particlesFor(10, 'low')).toBeLessThan(particlesFor(10, 'high'));
  });
});

describe('ParticlePool', () => {
  it('never grows past its size and replaces the oldest slots', () => {
    const pool = new ParticlePool(POOL_SIZE.low);
    for (let i = 0; i < 5000; i++) pool.emit();
    expect(pool.used).toBe(5000);
    const reused = Array.from({ length: 30 }, () => pool.emit());
    expect(reused).toEqual(Array.from({ length: 30 }, (_, i) => i));
    expect(pool.used).toBe(5000);
    expect(pool.total).toBe(5030);
  });
});
