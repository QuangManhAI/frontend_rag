import type { CompareCandidate, RagStreamEvent, RouteStep } from '../types/rag';
import type { TreeNode, VectorTable } from '../types/world';

/**
 * Real backend + mock world (temporary, until the UTH pipeline exports the world: backend
 * prompt_backend.md Phụ lục B P1).
 *
 * The real papers do not exist in the mock world and the backend sends an empty `route`, so the
 * 3D flight would have nothing to fly to. The bridge:
 *  - places each real paper on a vector of the mock world (stable: same paper, same vector) and
 *    renames that vector to the real paper id, so hover / citations open the real paper;
 *  - puts the papers of one answer under `nprobe` branches, one twig each, and rebuilds the
 *    `route` from those placements. Branch / twig scores are the real similarity of the best
 *    paper placed there (not a centroid score).
 */
export interface BridgeWorld {
  vectors: VectorTable;
  nodesById: ReadonlyMap<number, TreeNode>;
  childrenById: ReadonlyMap<number, number[]>;
  /** Mutated: real paper id ➔ vector index. */
  vectorIndexByPaperId: Map<string, number>;
  /** Mutated: the vector's id becomes the real paper id. */
  vectorIds: string[];
}

/** FNV-1a, for stable choices from a paper id. */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export class WorldBridge {
  /** Real paper id ➔ vector index, for papers this bridge placed. */
  private readonly placed = new Map<string, number>();
  private readonly taken = new Set<number>();
  private twigVectors: Map<number, number[]> | null = null;
  private twigVectorsCount = -1;

  /** A getter: the store replaces its arrays when the crawl appends vectors. */
  constructor(private readonly getWorld: () => BridgeWorld) {}

  private get world(): BridgeWorld {
    return this.getWorld();
  }

  /** Is this paper part of the mock world already (no bridging needed)? */
  private known(paperId: string): boolean {
    return this.world.vectorIndexByPaperId.has(paperId);
  }

  private vectorsOfTwig(twig: number): number[] {
    if (!this.twigVectors || this.twigVectorsCount !== this.world.vectors.count) {
      this.twigVectorsCount = this.world.vectors.count;
      this.twigVectors = new Map();
      const ids = this.world.vectors.twigIds;
      for (let i = 0; i < this.world.vectors.count; i++) {
        const list = this.twigVectors.get(ids[i]) ?? [];
        list.push(i);
        this.twigVectors.set(ids[i], list);
      }
    }
    return this.twigVectors.get(twig) ?? [];
  }

  /** `n` distinct branches picked from `seed`, each with its most populated twig. */
  targetTwigs(seed: string, n: number): number[] {
    const branches = [...this.world.nodesById.values()].filter((x) => x.depth === 1).map((x) => x.id).sort((a, b) => a - b);
    if (!branches.length) return [];
    const out: number[] = [];
    const start = hash(seed) % branches.length;
    for (let k = 0; k < branches.length && out.length < n; k++) {
      const b = branches[(start + k * 7) % branches.length];
      const twigs = (this.world.childrenById.get(b) ?? []).filter((t) => this.world.nodesById.get(t)?.depth === 2);
      const best = twigs.sort((x, y) => this.vectorsOfTwig(y).length - this.vectorsOfTwig(x).length)[0];
      if (best !== undefined && !out.includes(best) && this.vectorsOfTwig(best).length) out.push(best);
    }
    return out;
  }

  /** Places `paperId` on a free vector of `twig` (or anywhere if the twig is full). */
  private place(paperId: string, twig: number | undefined): number {
    const existing = this.placed.get(paperId);
    if (existing !== undefined) return existing;
    const count = this.world.vectors.count;
    const pool = twig === undefined ? [] : this.vectorsOfTwig(twig);
    let index = pool.find((i) => !this.taken.has(i));
    for (let k = 0; index === undefined && k < count; k++) {
      const i = (hash(paperId) + k) % count;
      if (!this.taken.has(i)) index = i;
    }
    if (index === undefined) return -1;
    this.taken.add(index);
    this.placed.set(paperId, index);
    this.world.vectorIndexByPaperId.set(paperId, index);
    this.world.vectorIds[index] = paperId;
    return index;
  }

  /** Places unknown papers, best first, round-robin over the target twigs. */
  placeAll(paperIds: readonly string[], twigs: readonly number[]): void {
    let k = 0;
    for (const id of paperIds) {
      if (this.known(id) && !this.placed.has(id)) continue;
      this.place(id, twigs.length ? twigs[k++ % twigs.length] : undefined);
    }
  }

  /** Route rebuilt from where the candidates sit: branches/twigs holding them, best first. */
  routeFor(candidates: readonly CompareCandidate[], nprobe: number): RouteStep[] {
    const twigScore = new Map<number, number>();
    for (const c of candidates) {
      const index = this.world.vectorIndexByPaperId.get(c.paper_id);
      if (index === undefined) continue;
      const twig = this.world.vectors.twigIds[index];
      twigScore.set(twig, Math.max(twigScore.get(twig) ?? -Infinity, c.score));
    }
    const branchScore = new Map<number, number>();
    for (const [twig, s] of twigScore) {
      const b = this.world.nodesById.get(twig)?.parent_id;
      if (b != null) branchScore.set(b, Math.max(branchScore.get(b) ?? -Infinity, s));
    }
    const top = (m: Map<number, number>, n: number) => [...m.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, n).map(([id]) => id);
    const chosen1 = top(branchScore, nprobe);
    const twigsUnder = new Map([...twigScore].filter(([t]) => chosen1.includes(this.world.nodesById.get(t)?.parent_id ?? -1)));
    return [
      { depth: 1, candidates: [...branchScore].map(([node_id, score]) => ({ node_id, score })), chosen: chosen1 },
      { depth: 2, candidates: [...twigsUnder].map(([node_id, score]) => ({ node_id, score })), chosen: top(twigsUnder, nprobe) },
    ];
  }
}

/**
 * Stream adapter: holds an empty `route` (and the `phase: comparing` after it) until `compare`
 * arrives, places the papers, then emits route ➔ phase ➔ compare in the original order.
 */
export async function* bridgeStream(
  events: AsyncIterable<RagStreamEvent>,
  bridge: WorldBridge,
  nprobe: number,
): AsyncGenerator<RagStreamEvent> {
  const held: RagStreamEvent[] = [];
  let holding = false;
  for await (const ev of events) {
    if (ev.type === 'route' && ev.steps.length === 0) {
      holding = true;
      continue;
    }
    if (holding && ev.type === 'phase') {
      held.push(ev);
      continue;
    }
    if (ev.type === 'compare') {
      const ids = [...ev.candidates].sort((a, b) => b.score - a.score).map((c) => c.paper_id);
      bridge.placeAll(ids, bridge.targetTwigs(ids[0] ?? '', nprobe));
      if (holding) {
        yield { type: 'route', steps: bridge.routeFor(ev.candidates, nprobe) };
        yield* held.splice(0);
        holding = false;
      }
      yield ev;
      continue;
    }
    if (holding) {
      // No compare came (e.g. an error): release what was held, unchanged.
      yield { type: 'route', steps: [] };
      yield* held.splice(0);
      holding = false;
    }
    if (ev.type === 'retrieval') bridge.placeAll(ev.grounded_chunks.map((g) => g.paper_id), []);
    yield ev;
  }
  if (holding) {
    yield { type: 'route', steps: [] };
    yield* held.splice(0);
  }
}
