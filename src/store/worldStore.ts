import { create } from 'zustand';
import { loadWorld } from '../api/client';
import type { Category, GroundLayout, TreeNode, VectorTable } from '../types/world';
import type { CrawlVectorItem } from '../types/crawl';
import { appendToGroups, groupVectorsByCategory, groupVectorsByCrate } from '../utils/groundLayout';
import { appendToTable } from '../utils/vectorTable';

interface WorldState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  categories: Category[];
  ground: GroundLayout | null;
  tree: TreeNode[];
  nodesById: Map<number, TreeNode>;
  childrenById: Map<number, number[]>;
  vectors: VectorTable | null;
  vectorIds: string[];
  vectorIndexByPaperId: Map<string, number>;
  vectorsByCrate: Map<number, Uint32Array>;
  vectorsByCategory: Map<number, Uint32Array>;
  /** Bumped on every append. The arrays (e.g. `vectors.positions`) are only replaced when they grow. */
  vectorsVersion: number;
  /** Per-vector birth time (seconds, `performance.now()/1000`); 0 = present from the start. */
  bornAt: Float32Array;
  load: () => Promise<void>;
  appendVectors: (items: readonly CrawlVectorItem[], born: number) => void;
}

export const useWorld = create<WorldState>((set, get) => ({
  status: 'idle',
  error: null,
  categories: [],
  ground: null,
  tree: [],
  nodesById: new Map(),
  childrenById: new Map(),
  vectors: null,
  vectorIds: [],
  vectorIndexByPaperId: new Map(),
  vectorsByCrate: new Map(),
  vectorsByCategory: new Map(),
  vectorsVersion: 0,
  bornAt: new Float32Array(0),

  load: async () => {
    if (get().status === 'loading' || get().status === 'ready') return;
    set({ status: 'loading', error: null });
    try {
      const w = await loadWorld();
      const nodesById = new Map(w.tree.map((n) => [n.id, n]));
      const childrenById = new Map<number, number[]>();
      for (const n of w.tree) {
        if (n.parent_id === null) continue;
        const list = childrenById.get(n.parent_id) ?? [];
        list.push(n.id);
        childrenById.set(n.parent_id, list);
      }
      set({
        status: 'ready',
        categories: w.categories,
        ground: w.ground,
        tree: w.tree,
        nodesById,
        childrenById,
        vectors: w.vectors,
        vectorIds: w.vectorIds,
        vectorIndexByPaperId: new Map(w.vectorIds.map((id, i) => [id, i])),
        vectorsByCrate: groupVectorsByCrate(w.vectors),
        vectorsByCategory: groupVectorsByCategory(w.vectors),
        bornAt: new Float32Array(w.vectors.count),
      });
    } catch (err) {
      set({ status: 'error', error: (err as Error).message });
    }
  },

  appendVectors: (items, born) => {
    const s = get();
    if (!s.vectors || items.length === 0) return;
    const fresh = items.filter((it) => !s.vectorIndexByPaperId.has(it.paper_id));
    if (fresh.length === 0) return;
    const { table, grown, start } = appendToTable(s.vectors, fresh);
    let bornAt = s.bornAt;
    if (bornAt.length < table.positions.length / 3) {
      bornAt = new Float32Array(table.positions.length / 3);
      bornAt.set(s.bornAt);
    }
    fresh.forEach((it, k) => {
      bornAt[start + k] = born;
      s.vectorIndexByPaperId.set(it.paper_id, start + k);
      // In place: readers index by position, and new ids land past every existing index.
      s.vectorIds.push(it.paper_id);
    });
    set({
      vectors: table,
      vectorsVersion: s.vectorsVersion + 1,
      bornAt,
      vectorsByCrate: appendToGroups(s.vectorsByCrate, fresh.map((it) => it.crate_id), start),
      vectorsByCategory: appendToGroups(s.vectorsByCategory, fresh.map((it) => it.category_index), start),
    });
  },
}));
