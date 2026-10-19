import type { Category, Crate, GroundLayout, Root, TreeNode, VectorTable, Vec3 } from '../../types/world';
import { cellToWorld } from '../../utils/groundLayout';
import { encodeVectors } from '../vectorParser';
import { gauss, mulberry32, pickWeighted } from './rng';

/** Ten real arXiv categories with share of papers and topic vocabulary for labels/titles. */
export const MOCK_CATEGORY_DEFS = [
  { code: 'cs.LG', name: 'Machine Learning', weight: 0.19, words: ['representation', 'optimization', 'generalization', 'gradient', 'federated', 'contrastive', 'diffusion', 'meta-learning'] },
  { code: 'cs.CL', name: 'Computation and Language', weight: 0.16, words: ['transformer', 'attention', 'llm', 'lora', 'instruction', 'tokenization', 'translation', 'alignment'] },
  { code: 'cs.CV', name: 'Computer Vision', weight: 0.14, words: ['segmentation', 'detection', 'vit', 'nerf', 'depth', 'tracking', 'diffusion', 'point cloud'] },
  { code: 'cs.AI', name: 'Artificial Intelligence', weight: 0.11, words: ['planning', 'agents', 'reasoning', 'knowledge graph', 'search', 'logic', 'multi-agent'] },
  { code: 'stat.ML', name: 'Statistical ML', weight: 0.09, words: ['bayesian', 'kernel', 'variational', 'causal', 'uncertainty', 'sampling', 'gaussian process'] },
  { code: 'cs.IR', name: 'Information Retrieval', weight: 0.08, words: ['ranking', 'dense retrieval', 'recommendation', 'rag', 'reranking', 'query expansion', 'bm25'] },
  { code: 'cs.RO', name: 'Robotics', weight: 0.07, words: ['manipulation', 'locomotion', 'slam', 'control', 'sim2real', 'grasping'] },
  { code: 'math.OC', name: 'Optimization and Control', weight: 0.06, words: ['convex', 'stochastic', 'minimax', 'adam', 'convergence', 'lagrangian'] },
  { code: 'q-bio.QM', name: 'Quantitative Methods', weight: 0.05, words: ['protein', 'genomics', 'single-cell', 'molecular', 'drug discovery'] },
  { code: 'physics.comp-ph', name: 'Computational Physics', weight: 0.05, words: ['pde', 'molecular dynamics', 'surrogate', 'turbulence', 'monte carlo'] },
] as const;

export interface MockWorldOptions {
  vectorCount?: number;
  branchCount?: number;
  twigsPerBranch?: number;
  gridSize?: number;
  tileSize?: number;
  papersPerCrate?: number;
}

/** Raw mock payloads, shaped exactly like the backend responses. */
export interface MockWorldRaw {
  categories: Category[];
  ground: GroundLayout;
  tree: TreeNode[];
  vectorsBuffer: ArrayBuffer;
  vectorIds: string[];
}

const TRUNK_TOP: Vec3 = [0, 35, 0];

function bezier(a: Vec3, c: Vec3, b: Vec3, n: number): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const u = 1 - t;
    out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1], u * u * a[2] + 2 * u * t * c[2] + t * t * b[2]]);
  }
  return out;
}

function threeWords(rng: () => number, words: readonly string[]): string {
  const pool = [...words];
  const out: string[] = [];
  while (out.length < 3 && pool.length > 0) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out.join(' · ');
}

export function generateMockWorld(seed = 7, opts: MockWorldOptions = {}): MockWorldRaw {
  const rng = mulberry32(seed);
  const vectorCount = opts.vectorCount ?? 30000;
  const branchCount = opts.branchCount ?? 14;
  const twigsPerBranch = opts.twigsPerBranch ?? 14;
  const gridN = opts.gridSize ?? 24;
  const tileSize = opts.tileSize ?? 3;
  const weights = MOCK_CATEGORY_DEFS.map((c) => c.weight);

  // ---- Tree: trunk top, branches (depth 1) and twigs (depth 2) ----
  const tree: TreeNode[] = [
    { id: 0, parent_id: null, depth: 0, label: 'root', leaf_count: vectorCount, dominant_category: 0, position: TRUNK_TOP, path: [[0, 0, 0], [0, 17.5, 0], TRUNK_TOP], radius: 2.1 },
  ];
  let nextId = 1;
  const branches: TreeNode[] = [];
  for (let b = 0; b < branchCount; b++) {
    const angle = (b / branchCount) * Math.PI * 2 + (rng() - 0.5) * 0.25;
    const y = 55 + rng() * 25;
    const reach = 26 + rng() * 14;
    const dir: Vec3 = [Math.cos(angle), 0, Math.sin(angle)];
    const pos: Vec3 = [dir[0] * reach, y, dir[2] * reach];
    const ctrl: Vec3 = [dir[0] * reach * 0.12, y - 4, dir[2] * reach * 0.12];
    const dominant = pickWeighted(rng, weights);
    const node: TreeNode = {
      id: nextId++, parent_id: 0, depth: 1, label: threeWords(rng, MOCK_CATEGORY_DEFS[dominant].words),
      leaf_count: 0, dominant_category: dominant, position: pos, path: bezier(TRUNK_TOP, ctrl, pos, 10), radius: 0.95 + rng() * 0.35,
    };
    branches.push(node);
    tree.push(node);
  }
  const twigs: TreeNode[] = [];
  for (const br of branches) {
    const baseAngle = Math.atan2(br.position[2], br.position[0]);
    for (let k = 0; k < twigsPerBranch; k++) {
      const a = baseAngle + (rng() - 0.5) * 1.5;
      const reach = 9 + rng() * 15;
      const y = Math.min(105, Math.max(75, br.position[1] + 8 + rng() * 26));
      const pos: Vec3 = [br.position[0] + Math.cos(a) * reach, y, br.position[2] + Math.sin(a) * reach];
      const ctrl: Vec3 = [br.position[0] + Math.cos(a) * reach * 0.25, br.position[1] + (y - br.position[1]) * 0.85, br.position[2] + Math.sin(a) * reach * 0.25];
      const dominant = rng() < 0.6 ? br.dominant_category : pickWeighted(rng, weights);
      const node: TreeNode = {
        id: nextId++, parent_id: br.id, depth: 2, label: threeWords(rng, MOCK_CATEGORY_DEFS[dominant].words),
        leaf_count: 0, dominant_category: dominant, position: pos, path: bezier(br.position, ctrl, pos, 8), radius: 0.32 + rng() * 0.14,
      };
      twigs.push(node);
      tree.push(node);
    }
  }

  // ---- Vectors: dense ellipsoids around each twig tip ----
  const twigWeights = twigs.map(() => 0.4 + rng() * 1.2);
  const wSum = twigWeights.reduce((a, b) => a + b, 0);
  const perTwig = twigWeights.map((w) => Math.floor((w / wSum) * vectorCount));
  let assigned = perTwig.reduce((a, b) => a + b, 0);
  for (let i = 0; assigned < vectorCount; i = (i + 1) % perTwig.length, assigned++) perTwig[i]++;

  const table: VectorTable = {
    count: vectorCount,
    positions: new Float32Array(vectorCount * 3),
    twigIds: new Uint32Array(vectorCount),
    crateIds: new Uint32Array(vectorCount),
    categories: new Uint16Array(vectorCount),
    years: new Uint16Array(vectorCount),
    authority: new Float32Array(vectorCount),
    flags: new Uint8Array(vectorCount),
  };
  let vi = 0;
  twigs.forEach((tw, ti) => {
    const n = perTwig[ti];
    tw.leaf_count = n;
    const R = 2.6 + Math.cbrt(n) * 0.75;
    for (let k = 0; k < n; k++, vi++) {
      const x = tw.position[0] + gauss(rng) * R * 0.5;
      const y = Math.min(112, Math.max(40, tw.position[1] + gauss(rng) * R * 0.32 + 1.5));
      const z = tw.position[2] + gauss(rng) * R * 0.5;
      table.positions[vi * 3] = x;
      table.positions[vi * 3 + 1] = y;
      table.positions[vi * 3 + 2] = z;
      table.twigIds[vi] = tw.id;
      table.categories[vi] = rng() < 0.7 ? tw.dominant_category : pickWeighted(rng, weights);
      table.years[vi] = 2026 - Math.floor(Math.pow(rng(), 1.8) * 20);
      table.authority[vi] = Math.pow(rng(), 3.5);
      table.flags[vi] = rng() < 0.15 ? 1 : 0;
    }
  });
  for (const br of branches) br.leaf_count = twigs.filter((t) => t.parent_id === br.id).reduce((a, t) => a + t.leaf_count, 0);

  // ---- Ground: contiguous patches of crates per category ----
  const perCategory = MOCK_CATEGORY_DEFS.map(() => 0);
  for (let i = 0; i < vectorCount; i++) perCategory[table.categories[i]]++;
  const cells = gridN * gridN;
  const papersPerCrate = Math.max(opts.papersPerCrate ?? 190, Math.ceil(vectorCount / (cells * 0.45)));
  const occupied = new Int32Array(cells).fill(-1);
  const crates: Crate[] = [];
  const cratesByCategory: number[][] = MOCK_CATEGORY_DEFS.map(() => []);
  const order = perCategory.map((n, i) => ({ n, i })).sort((a, b) => b.n - a.n);
  const center = (gridN - 1) / 2;
  order.forEach(({ n, i: cat }, rank) => {
    const want = Math.max(1, Math.round(n / papersPerCrate));
    const angle = rank * 2.39996 + seed;
    const rad = rank === 0 ? 0 : 2.5 + Math.sqrt(rank) * 3.6;
    const tx = center + Math.cos(angle) * rad;
    const ty = center + Math.sin(angle) * rad;
    let seedCell = -1;
    let best = Infinity;
    for (let c = 0; c < cells; c++) {
      if (occupied[c] !== -1) continue;
      const d = (c % gridN - tx) ** 2 + (Math.floor(c / gridN) - ty) ** 2;
      if (d < best) {
        best = d;
        seedCell = c;
      }
    }
    if (seedCell < 0) return;
    const sx = seedCell % gridN;
    const sy = Math.floor(seedCell / gridN);
    const frontier = [seedCell];
    const inFrontier = new Set(frontier);
    let taken = 0;
    while (taken < want && frontier.length > 0) {
      let bi = 0;
      let bd = Infinity;
      frontier.forEach((c, idx) => {
        const d = (c % gridN - sx) ** 2 + (Math.floor(c / gridN) - sy) ** 2 + rng() * 0.8;
        if (d < bd) {
          bd = d;
          bi = idx;
        }
      });
      const c = frontier.splice(bi, 1)[0];
      if (occupied[c] !== -1) continue;
      occupied[c] = cat;
      const col = c % gridN;
      const row = Math.floor(c / gridN);
      const crate: Crate = { id: crates.length, category_index: cat, cell: [col, row], paper_count: 0 };
      crates.push(crate);
      cratesByCategory[cat].push(crate.id);
      taken++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = col + dx;
        const ny = row + dy;
        if (nx < 0 || ny < 0 || nx >= gridN || ny >= gridN) continue;
        const nc = ny * gridN + nx;
        if (occupied[nc] === -1 && !inFrontier.has(nc)) {
          frontier.push(nc);
          inFrontier.add(nc);
        }
      }
    }
  });
  for (let i = 0; i < vectorCount; i++) {
    const list = cratesByCategory[table.categories[i]];
    const k = rng() < 0.6 ? (table.twigIds[i] * 7) % list.length : Math.floor(rng() * list.length);
    table.crateIds[i] = list[k];
    crates[list[k]].paper_count++;
  }

  // ---- Roots: bundled per category through a shared hub, ending at the trunk base ----
  const grid: readonly [number, number] = [gridN, gridN];
  const roots: Root[] = crates.map((cr) => {
    const siblings = cratesByCategory[cr.category_index].map((id) => cellToWorld(crates[id].cell, grid, tileSize));
    const hx = (siblings.reduce((a, p) => a + p[0], 0) / siblings.length) * 0.5;
    const hz = (siblings.reduce((a, p) => a + p[2], 0) / siblings.length) * 0.5;
    const w = cellToWorld(cr.cell, grid, tileSize);
    const mid: Vec3 = [w[0] + (hx - w[0]) * 0.45, -4.2 - rng() * 1.2, w[2] + (hz - w[2]) * 0.45];
    return {
      crate_id: cr.id,
      path: [[w[0], -2, w[2]], mid, [hx, -5.2, hz], [hx * 0.32, -3.2, hz * 0.32], [0, 0, 0]],
    };
  });

  const categories: Category[] = MOCK_CATEGORY_DEFS.map((c, index) => ({ index, code: c.code, name: c.name, paper_count: perCategory[index] }));

  // ---- Paper ids: arXiv style YYMM.NNNNN, unique ----
  const seq = new Map<string, number>();
  const vectorIds: string[] = [];
  for (let i = 0; i < vectorCount; i++) {
    const yymm = `${String(table.years[i] % 100).padStart(2, '0')}${String(1 + Math.floor(rng() * 12)).padStart(2, '0')}`;
    const n = (seq.get(yymm) ?? Math.floor(rng() * 900)) + 1 + Math.floor(rng() * 3);
    seq.set(yymm, n);
    vectorIds.push(`${yymm}.${String(n).padStart(5, '0')}`);
  }

  return {
    categories,
    ground: { tile_size: tileSize, grid_size: grid, crates, roots },
    tree,
    vectorsBuffer: encodeVectors(table),
    vectorIds,
  };
}
