import { create } from 'zustand';
import { loadWorld } from '../api/client';
import type { Category, GroundLayout, TreeNode, VectorTable } from '../types/world';
import { groupVectorsByCategory, groupVectorsByCrate } from '../utils/groundLayout';

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
  load: () => Promise<void>;
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
      });
    } catch (err) {
      set({ status: 'error', error: (err as Error).message });
    }
  },
}));
