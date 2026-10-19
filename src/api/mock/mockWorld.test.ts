import { describe, expect, it } from 'vitest';
import { parseVectors } from '../vectorParser';
import { generateMockWorld } from './mockWorld';

const raw = generateMockWorld(7, { vectorCount: 6000 });
const vectors = parseVectors(raw.vectorsBuffer);

describe('mockWorld', () => {
  it('is deterministic for a seed', () => {
    const again = generateMockWorld(7, { vectorCount: 6000 });
    expect(new Uint8Array(again.vectorsBuffer)).toEqual(new Uint8Array(raw.vectorsBuffer));
    expect(again.ground).toEqual(raw.ground);
    expect(again.vectorIds).toEqual(raw.vectorIds);
    expect(generateMockWorld(8, { vectorCount: 6000 }).vectorIds).not.toEqual(raw.vectorIds);
  });

  it('every twig_id and crate_id exists', () => {
    const twigs = new Set(raw.tree.filter((n) => n.depth === 2).map((n) => n.id));
    const crates = new Set(raw.ground.crates.map((c) => c.id));
    for (let i = 0; i < vectors.count; i++) {
      expect(twigs.has(vectors.twigIds[i])).toBe(true);
      expect(crates.has(vectors.crateIds[i])).toBe(true);
    }
  });

  it('crate category matches its vectors and counts add up', () => {
    const byId = new Map(raw.ground.crates.map((c) => [c.id, c]));
    const counts = new Map<number, number>();
    for (let i = 0; i < vectors.count; i++) {
      expect(byId.get(vectors.crateIds[i])?.category_index).toBe(vectors.categories[i]);
      counts.set(vectors.crateIds[i], (counts.get(vectors.crateIds[i]) ?? 0) + 1);
    }
    for (const c of raw.ground.crates) expect(c.paper_count).toBe(counts.get(c.id) ?? 0);
    expect(raw.categories.reduce((a, c) => a + c.paper_count, 0)).toBe(vectors.count);
  });

  it('crates never share a cell', () => {
    const cells = raw.ground.crates.map((c) => c.cell.join(','));
    expect(new Set(cells).size).toBe(cells.length);
  });

  it('crates of one category form a single contiguous patch', () => {
    const byCat = new Map<number, Set<string>>();
    for (const c of raw.ground.crates) {
      const s = byCat.get(c.category_index) ?? new Set<string>();
      s.add(c.cell.join(','));
      byCat.set(c.category_index, s);
    }
    for (const cells of byCat.values()) {
      const start = cells.values().next().value as string;
      const seen = new Set([start]);
      const stack = [start];
      while (stack.length) {
        const [x, y] = (stack.pop() as string).split(',').map(Number);
        for (const k of [`${x + 1},${y}`, `${x - 1},${y}`, `${x},${y + 1}`, `${x},${y - 1}`]) {
          if (cells.has(k) && !seen.has(k)) {
            seen.add(k);
            stack.push(k);
          }
        }
      }
      expect(seen.size).toBe(cells.size);
    }
  });

  it('respects the world coordinate system', () => {
    for (let i = 0; i < vectors.count; i++) {
      const y = vectors.positions[i * 3 + 1];
      expect(y).toBeGreaterThanOrEqual(35);
      expect(y).toBeLessThanOrEqual(115);
    }
    for (const r of raw.ground.roots) {
      expect(r.path[0][1]).toBe(-2);
      expect(r.path[r.path.length - 1]).toEqual([0, 0, 0]);
    }
    expect(raw.tree[0]).toMatchObject({ id: 0, parent_id: null, position: [0, 35, 0] });
    expect(new Set(raw.vectorIds).size).toBe(raw.vectorIds.length);
  });
});
