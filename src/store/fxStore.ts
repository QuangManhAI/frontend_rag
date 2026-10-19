import { create } from 'zustand';
import type { Vec3 } from '../types/world';

/** Branch highlight: 1 = chosen by the router, 2 = rejected candidate. */
export type BranchMark = 1 | 2;

/** A retrieved paper as shown in 3D (several chunks of one paper → one vector). */
export interface TopKItem {
  paper_id: string;
  index: number;
  rank: number;
  final_score: number;
  chunkCount: number;
}

export interface RouteLabel {
  node_id: number;
  score: number;
  chosen: boolean;
}

/**
 * Transient visual state written by QueryFlight at stage boundaries (never per frame)
 * and read by the canopy, branches and ground.
 */
interface FxState {
  /** vector index → VectorState (2 comparing, 3 top-k, 4 focused). */
  overlay: Map<number, number>;
  branchMarks: Map<number, BranchMark>;
  routeLabels: RouteLabel[];
  pulsingCrates: Set<number>;
  topK: TopKItem[];
  /** Where the orb rests once the best vector is found. */
  anchor: Vec3 | null;
  /**
   * How much the canopy points without a flight state dim (0..1): partly while the orb searches
   * (a camera looking through 150k bright points blows out to white), fully once the ranks are found.
   */
  dim: number;
  setOverlay: (overlay: Map<number, number>) => void;
  patchOverlay: (entries: Iterable<readonly [number, number]>) => void;
  setBranchMarks: (marks: Map<number, BranchMark>) => void;
  setRouteLabels: (labels: RouteLabel[]) => void;
  setPulsingCrates: (crates: Set<number>) => void;
  setFound: (topK: TopKItem[], anchor: Vec3 | null) => void;
  setDim: (dim: number) => void;
  reset: () => void;
}

export const useFx = create<FxState>((set, get) => ({
  overlay: new Map(),
  branchMarks: new Map(),
  routeLabels: [],
  pulsingCrates: new Set(),
  topK: [],
  anchor: null,
  dim: 0,
  setOverlay: (overlay) => set({ overlay }),
  patchOverlay: (entries) => {
    const next = new Map(get().overlay);
    for (const [i, s] of entries) next.set(i, s);
    set({ overlay: next });
  },
  setBranchMarks: (branchMarks) => set({ branchMarks }),
  setRouteLabels: (routeLabels) => set({ routeLabels }),
  setPulsingCrates: (pulsingCrates) => set({ pulsingCrates }),
  setFound: (topK, anchor) => set({ topK, anchor }),
  setDim: (dim) => set({ dim }),
  reset: () => set({ overlay: new Map(), branchMarks: new Map(), routeLabels: [], pulsingCrates: new Set(), topK: [], anchor: null, dim: 0 }),
}));

/** Live orb position for the follow camera; mutated every frame, never stored in React state. */
export const flightProbe = { active: false, position: [0, 125, 0] as [number, number, number] };
