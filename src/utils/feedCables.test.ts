import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../api/mock/rng';
import type { Crate, GroundLayout } from '../types/world';
import { BLOCK_TOP_Y, buildBlocks, buildTubes, CABLE_FAR_Y, CABLE_SAMPLES, cablePath, liftAt, liftPath, PulseTrain, tubeRadius, zoneHeights, zonesOf } from './feedCables';
import { cellToWorld } from './groundLayout';

// Zone 0: an L of three cells; zone 1: a single cell far away.
const crates: Crate[] = [
  { id: 0, category_index: 0, cell: [2, 2], paper_count: 100 },
  { id: 1, category_index: 0, cell: [3, 2], paper_count: 300 },
  { id: 2, category_index: 0, cell: [2, 3], paper_count: 100 },
  { id: 3, category_index: 4, cell: [20, 20], paper_count: 50 },
];
const ground: GroundLayout = { tile_size: 3, grid_size: [24, 24], crates, roots: [] };

describe('zonesOf', () => {
  it('groups crates per category, in category order, with the plug on a zone cell', () => {
    const zones = zonesOf(ground);
    expect(zones.map((z) => [z.index, z.category_index, z.papers])).toEqual([
      [0, 0, 500],
      [1, 4, 50],
    ]);
    const plugCell = cellToWorld([2, 2], ground.grid_size, ground.tile_size);
    expect(zones[0].plug).toEqual([plugCell[0], plugCell[2]]);
  });

  it('heights grow with crawled papers of any crate in the zone', () => {
    const zones = zonesOf(ground);
    const before = zoneHeights(zones, new Map(), new Float32Array(2));
    const after = zoneHeights(zones, new Map([[1, 400]]), new Float32Array(2));
    expect(after[0]).toBeGreaterThan(before[0]);
    expect(after[1]).toBe(before[1]);
  });
});

describe('cablePath', () => {
  const [zone] = zonesOf(ground);
  const bottom = BLOCK_TOP_Y - 9;
  const path = cablePath(zone, bottom);

  it('starts deep and far out, ends exactly at the block bottom under the plug', () => {
    expect(path).toHaveLength(CABLE_SAMPLES);
    expect(path[0][1]).toBeCloseTo(CABLE_FAR_Y);
    expect(Math.hypot(path[0][0] - zone.plug[0], path[0][2] - zone.plug[1])).toBeGreaterThan(50);
    const end = path[path.length - 1];
    expect(end[0]).toBeCloseTo(zone.plug[0]);
    expect(end[1]).toBeCloseTo(bottom);
    expect(end[2]).toBeCloseTo(zone.plug[1]);
  });

  it('rises monotonically and plugs in vertically', () => {
    for (let i = 1; i < path.length; i++) expect(path[i][1]).toBeGreaterThan(path[i - 1][1]);
    const a = path[path.length - 2];
    const b = path[path.length - 1];
    const horiz = Math.hypot(b[0] - a[0], b[2] - a[2]);
    expect(horiz / (b[1] - a[1])).toBeLessThan(0.05);
  });

  it('liftPath moves only the upper part, the plug by the full amount', () => {
    const lifted = liftPath(path, -3);
    expect(lifted[0]).toEqual(path[0]);
    expect(lifted[lifted.length - 1][1]).toBeCloseTo(bottom - 3);
    expect(liftAt(0.5)).toBe(0);
    expect(liftAt(1)).toBe(1);
  });
});

describe('buildTubes', () => {
  it('builds one mesh for all cables, rings at the given radius, flaring at the plug', () => {
    const zones = zonesOf(ground);
    const paths = zones.map((z) => cablePath(z, -10, 12));
    const radial = 8;
    const t = buildTubes(paths, [0, 1], (u) => tubeRadius(u, 1), radial);
    expect(t.position.length).toBe(2 * 12 * radial * 3);
    expect(t.index.length).toBe(2 * 11 * radial * 6);
    expect(Math.max(...t.index)).toBeLessThan(t.position.length / 3);
    expect(t.zone[0]).toBe(0);
    expect(t.zone[t.zone.length - 1]).toBe(1);
    // Ring 3 of cable 0 is at radius 1 around its path point, perpendicular to the tangent.
    const p = paths[0][3];
    for (let k = 0; k < radial; k++) {
      const v = (3 * radial + k) * 3;
      expect(Math.hypot(t.position[v] - p[0], t.position[v + 1] - p[1], t.position[v + 2] - p[2])).toBeCloseTo(1);
    }
    expect(tubeRadius(1, 1)).toBeCloseTo(2.6);
    expect(tubeRadius(0.5, 1)).toBe(1);
  });
});

describe('buildBlocks', () => {
  const zones = zonesOf(ground);
  const b = buildBlocks(zones, ground, 0.1);

  it('has a top and bottom quad per cell and walls only on the outline (no inner walls)', () => {
    const faces = Array.from(b.face);
    const quads = (f: number) => faces.filter((x) => x === f).length / 4;
    expect(quads(0)).toBe(4);
    expect(quads(1)).toBe(4);
    // L of 3 cells: 8 outer unit edges; single cell: 4.
    expect(quads(2)).toBe(12);
  });

  it('outlines turn only at corners: L shape has 6 vertical edges, a single cell 4', () => {
    const vertical = (zone: number) => {
      let n = 0;
      for (let i = 0; i < b.edgeZone.length; i += 2) {
        if (b.edgeZone[i] !== zone) continue;
        if (b.edges[i * 3 + 1] !== b.edges[i * 3 + 4]) n++;
      }
      return n;
    };
    expect(vertical(0)).toBe(6);
    expect(vertical(1)).toBe(4);
  });
});

describe('PulseTrain', () => {
  it('fires every 1.5–3 s per zone with different phases, much faster when active', () => {
    expect(PulseTrain.interval(0, 0)).toBe(1.5);
    expect(PulseTrain.interval(1, 0)).toBe(3);
    expect(PulseTrain.interval(1, 1)).toBeLessThan(1);
    const train = new PulseTrain(3, mulberry32(1));
    const starts = new Set<number>();
    for (let t = 0; t < 3.05; t += 0.05) train.update(t, [0, 0, 0], [2, 2, 2]);
    for (let z = 0; z < 3; z++) starts.add(Math.round(train.pulses[z * 8] * 100));
    expect(starts.size).toBe(3);
  });

  it('reports each arrival exactly once, after its travel time', () => {
    const train = new PulseTrain(1, () => 0, 4, 0);
    expect(train.update(0, [0], [2])).toEqual([]);
    expect(train.update(1.9, [0], [2])).toEqual([]);
    expect(train.update(2.0, [0], [2])).toEqual([0]);
    expect(train.update(2.1, [0], [2])).toEqual([]);
  });
});
