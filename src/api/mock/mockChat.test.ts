import { describe, expect, it } from 'vitest';
import type { RagStreamEvent } from '../../types/rag';
import type { WorldData } from '../../types/world';
import { parseVectors } from '../vectorParser';
import { buildChatScript, buildIndex, COMPARE_SIZE, mockPaperDetail, type MockContext } from './mockChat';
import { generateMockWorld } from './mockWorld';

const raw = generateMockWorld(7, { vectorCount: 8000 });
const world: WorldData = { categories: raw.categories, ground: raw.ground, tree: raw.tree, vectors: parseVectors(raw.vectorsBuffer), vectorIds: raw.vectorIds };
const ctx: MockContext = { world, indexByPaperId: buildIndex(world.vectorIds) };

function events(query: string, top_k = 5, nprobe = 2): RagStreamEvent[] {
  return buildChatScript({ query, top_k, nprobe }, ctx).map((s) => s.event);
}
function find<T extends RagStreamEvent['type']>(evs: RagStreamEvent[], type: T): Extract<RagStreamEvent, { type: T }> {
  const e = evs.find((x) => x.type === type);
  if (!e) throw new Error(`no ${type}`);
  return e as Extract<RagStreamEvent, { type: T }>;
}

describe('mockChat', () => {
  const evs = events('LoRA cho transformer');
  const route = find(evs, 'route');
  const compare = find(evs, 'compare');
  const retrieval = find(evs, 'retrieval');
  const done = find(evs, 'done');

  it('emits phases in order', () => {
    const phases = evs.filter((e) => e.type === 'phase').map((e) => (e.type === 'phase' ? e.phase : ''));
    expect(phases).toEqual(['embedding', 'flying', 'comparing', 'found', 'generating']);
    expect(evs[evs.length - 1].type).toBe('done');
  });

  it('routes through real nodes and honours nprobe', () => {
    const ids = new Set(world.tree.map((n) => n.id));
    for (const s of route.steps) for (const c of s.candidates) expect(ids.has(c.node_id)).toBe(true);
    expect(route.steps[0].chosen).toHaveLength(2);
    expect(find(events('x', 5, 3), 'route').steps[0].chosen).toHaveLength(3);
  });

  it('compare vectors belong to chosen twigs, sorted by score desc', () => {
    const twigs = new Set(route.steps.find((s) => s.depth === 2)?.chosen);
    expect(compare.candidates.length).toBe(COMPARE_SIZE);
    compare.candidates.forEach((c, i) => {
      const idx = ctx.indexByPaperId.get(c.paper_id);
      expect(idx).toBeDefined();
      expect(twigs.has(world.vectors.twigIds[idx as number])).toBe(true);
      if (i > 0) expect(c.score).toBeLessThanOrEqual(compare.candidates[i - 1].score);
    });
  });

  it('grounded chunks are the top_k of compare', () => {
    const papers = [...new Set(retrieval.grounded_chunks.map((g) => g.paper_id))];
    expect(papers.sort()).toEqual(compare.candidates.slice(0, 5).map((c) => c.paper_id).sort());
    for (const g of retrieval.grounded_chunks) {
      const detail = mockPaperDetail(ctx, g.paper_id);
      expect(detail?.chunks.some((c) => c.chunk_id === g.chunk_id)).toBe(true);
    }
  });

  it('cites 2–3 grounded papers plus one that is not in context', () => {
    const grounded = new Set(retrieval.grounded_chunks.map((g) => g.paper_id));
    const inside = done.citations.filter((c) => grounded.has(c));
    const outside = done.citations.filter((c) => !grounded.has(c));
    expect(inside.length).toBeGreaterThanOrEqual(2);
    expect(inside.length).toBeLessThanOrEqual(3);
    expect(outside).toHaveLength(1);
    expect(ctx.indexByPaperId.has(outside[0])).toBe(false);
  });

  it('answer tokens rebuild an answer with citations and LaTeX', () => {
    const text = evs.map((e) => (e.type === 'token' ? e.text : '')).join('');
    expect(text).toContain('[Paper:');
    expect(text).toContain('$$');
  });

  it('"/error" produces an error event', () => {
    expect(events('thử /error').some((e) => e.type === 'error')).toBe(true);
  });
});
