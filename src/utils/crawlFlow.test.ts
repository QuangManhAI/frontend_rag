import { describe, expect, it } from 'vitest';
import type { Crate, GroundLayout } from '../types/world';
import { BatchAggregator, ParticlePool, particlesFor, POOL_SIZE, SOURCE_Y, columnPath, zoneColumns } from './crawlFlow';
import { cellToWorld } from './groundLayout';

const ground: GroundLayout = { tile_size: 3, grid_size: [24, 24], crates: [], roots: [] };
const crate: Crate = { id: 12, category_index: 1, cell: [5, 17], paper_count: 200 };

describe('zoneColumns / columnPath', () => {
  const zg: GroundLayout = {
    tile_size: 3,
    grid_size: [24, 24],
    roots: [],
    crates: [
      { id: 0, category_index: 0, cell: [2, 2], paper_count: 100 },
      { id: 1, category_index: 0, cell: [3, 2], paper_count: 400 },
      { id: 2, category_index: 1, cell: [20, 20], paper_count: 50 },
      crate,
    ],
  };
  const heightOf = (c: Crate) => c.paper_count / 100;

  it('gives one column per category zone, centred under its crates', () => {
    const cols = zoneColumns(zg, heightOf);
    expect(cols.map((c) => c.category_index)).toEqual([0, 1]);
    const [a] = cols;
    const p0 = cellToWorld([2, 2], zg.grid_size, zg.tile_size);
    const p1 = cellToWorld([3, 2], zg.grid_size, zg.tile_size);
    expect(a.x).toBeCloseTo((p0[0] + p1[0]) / 2);
    expect(a.z).toBeCloseTo(p0[2]);
    expect(a.bottom).toBeCloseTo(-2 - 4);
    expect(a.crateIds).toEqual([0, 1]);
    expect(cols[1].crateIds).toEqual([2, 12]);
  });

  it('rises straight up from the source layer to the zone bottom', () => {
    const [col] = zoneColumns(zg, heightOf);
    const path = columnPath(col);
    expect(path).toHaveLength(16);
    expect(path[0][1]).toBe(SOURCE_Y);
    expect(path[path.length - 1][1]).toBeCloseTo(col.bottom);
    for (const p of path) {
      expect(p[0]).toBe(col.x);
      expect(p[2]).toBe(col.z);
    }
    for (let i = 1; i < path.length; i++) expect(path[i][1]).toBeGreaterThan(path[i - 1][1]);
  });
});

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
