import { describe, expect, it } from 'vitest';
import type { CompareCandidate, RagStreamEvent } from '../types/rag';
import { getMockContext } from './client';
import { bridgeStream, WorldBridge, type BridgeWorld } from './worldBridge';

function freshWorld(): BridgeWorld {
  const { world } = getMockContext();
  const nodesById = new Map(world.tree.map((n) => [n.id, n]));
  const childrenById = new Map<number, number[]>();
  for (const n of world.tree) {
    if (n.parent_id === null) continue;
    childrenById.set(n.parent_id, [...(childrenById.get(n.parent_id) ?? []), n.id]);
  }
  return {
    vectors: world.vectors,
    nodesById,
    childrenById,
    vectorIndexByPaperId: new Map(world.vectorIds.map((id, i) => [id, i])),
    vectorIds: [...world.vectorIds],
  };
}

const candidates: CompareCandidate[] = [
  { paper_id: '2106.09685', score: 0.83 },
  { paper_id: '2305.14314', score: 0.79 },
  { paper_id: '2402.12354', score: 0.71 },
  { paper_id: 's2_abc', score: 0.6 },
];

async function collect(it: AsyncIterable<RagStreamEvent>): Promise<RagStreamEvent[]> {
  const out: RagStreamEvent[] = [];
  for await (const e of it) out.push(e);
  return out;
}

async function* from(events: RagStreamEvent[]): AsyncGenerator<RagStreamEvent> {
  for (const e of events) yield e;
}

describe('WorldBridge', () => {
  it('places real papers on distinct vectors and renames them', () => {
    const w = freshWorld();
    const b = new WorldBridge(() => w);
    b.placeAll(candidates.map((c) => c.paper_id), b.targetTwigs('2106.09685', 2));
    const idx = candidates.map((c) => w.vectorIndexByPaperId.get(c.paper_id));
    expect(idx.every((i) => i !== undefined && i >= 0)).toBe(true);
    expect(new Set(idx).size).toBe(candidates.length);
    for (const c of candidates) expect(w.vectorIds[w.vectorIndexByPaperId.get(c.paper_id)!]).toBe(c.paper_id);
  });

  it('is stable: a paper keeps its vector across answers', () => {
    const w = freshWorld();
    const b = new WorldBridge(() => w);
    b.placeAll(['2106.09685'], b.targetTwigs('x', 2));
    const first = w.vectorIndexByPaperId.get('2106.09685');
    b.placeAll(['2106.09685', '2305.14314'], b.targetTwigs('y', 2));
    expect(w.vectorIndexByPaperId.get('2106.09685')).toBe(first);
  });

  it('rebuilds a route whose chosen twigs hold the papers, with nprobe branches', () => {
    const w = freshWorld();
    const b = new WorldBridge(() => w);
    const twigs = b.targetTwigs('2106.09685', 2);
    expect(twigs).toHaveLength(2);
    b.placeAll(candidates.map((c) => c.paper_id), twigs);
    const [d1, d2] = b.routeFor(candidates, 2);
    expect(d1.depth).toBe(1);
    expect(d1.chosen).toHaveLength(2);
    expect(d2.chosen.sort()).toEqual([...twigs].sort());
    for (const t of d2.chosen) expect(d1.chosen).toContain(w.nodesById.get(t)?.parent_id);
    // Scores are the real paper similarities, best paper ➔ best branch.
    expect(Math.max(...d1.candidates.map((c) => c.score))).toBe(0.83);
  });

  it('leaves papers that already exist in the world alone', () => {
    const w = freshWorld();
    const mockId = w.vectorIds[5];
    const b = new WorldBridge(() => w);
    b.placeAll([mockId], b.targetTwigs('z', 1));
    expect(w.vectorIndexByPaperId.get(mockId)).toBe(5);
  });
});

describe('bridgeStream', () => {
  it('holds an empty route until compare, then emits route ➔ phase ➔ compare in order', async () => {
    const w = freshWorld();
    const out = await collect(
      bridgeStream(
        from([
          { type: 'phase', phase: 'embedding' },
          { type: 'phase', phase: 'flying' },
          { type: 'route', steps: [] },
          { type: 'phase', phase: 'comparing' },
          { type: 'compare', candidates },
          { type: 'phase', phase: 'found' },
          { type: 'done', citations: [], timings: { embed_ms: 0, route_ms: 0, search_ms: 0, rerank_ms: 0, llm_ms: 0, total_ms: 0 } },
        ]),
        new WorldBridge(() => w),
        2,
      ),
    );
    expect(out.map((e) => (e.type === 'phase' ? e.phase : e.type))).toEqual(['embedding', 'flying', 'route', 'comparing', 'compare', 'found', 'done']);
    const route = out.find((e) => e.type === 'route');
    expect(route?.type === 'route' && route.steps[1].chosen.length).toBe(2);
  });

  it('passes a real (non-empty) route through untouched', async () => {
    const w = freshWorld();
    const steps = [{ depth: 1 as const, candidates: [{ node_id: 1, score: 0.5 }], chosen: [1] }];
    const out = await collect(bridgeStream(from([{ type: 'route', steps }]), new WorldBridge(() => w), 2));
    expect(out).toEqual([{ type: 'route', steps }]);
  });

  it('releases held events unchanged when an error replaces compare', async () => {
    const w = freshWorld();
    const out = await collect(
      bridgeStream(
        from([
          { type: 'route', steps: [] },
          { type: 'phase', phase: 'comparing' },
          { type: 'error', message: 'qdrant unavailable', status: 503 },
        ]),
        new WorldBridge(() => w),
        2,
      ),
    );
    expect(out.map((e) => e.type)).toEqual(['route', 'phase', 'error']);
  });
});
