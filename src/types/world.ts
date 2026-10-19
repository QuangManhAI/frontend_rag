/** Immutable 3D coordinate tuple in world space. */
export type Vec3 = readonly [number, number, number];

/** A paper category served by `GET /api/world/categories`. */
export interface Category {
  index: number;
  code: string;
  name: string;
  paper_count: number;
}

/** One book crate under the ground; occupies exactly one grid cell. */
export interface Crate {
  id: number;
  category_index: number;
  cell: readonly [number, number];
  paper_count: number;
}

/** A root polyline from the top of a crate up to the trunk base (0,0,0). */
export interface Root {
  crate_id: number;
  path: Vec3[];
}

/** Ground tiles, crates and roots served by `GET /api/world/ground`. */
export interface GroundLayout {
  tile_size: number;
  grid_size: readonly [number, number];
  crates: Crate[];
  roots: Root[];
}

/** One node of the hierarchical k-means tree (0 = top of the trunk). */
export interface TreeNode {
  id: number;
  parent_id: number | null;
  depth: 0 | 1 | 2;
  label: string;
  leaf_count: number;
  dominant_category: number;
  position: Vec3;
  path: Vec3[];
  radius: number;
}

/** Column-oriented decode of `vectors.bin` (one entry per paper vector). */
export interface VectorTable {
  count: number;
  positions: Float32Array;
  twigIds: Uint32Array;
  crateIds: Uint32Array;
  categories: Uint16Array;
  years: Uint16Array;
  authority: Float32Array;
  flags: Uint8Array;
}

/** Section kind of a paper chunk. */
export type SectionType = 'abstract' | 'introduction' | 'method' | 'experiment' | 'discussion' | 'other';

/** One text chunk of a paper. */
export interface Chunk {
  chunk_id: string;
  section_title: string;
  section_type: SectionType;
  text: string;
}

/** Paper metadata served by `GET /api/papers/:paper_id`. */
export interface PaperDetail {
  paper_id: string;
  title: string;
  authors: string[];
  category_index: number;
  year: number;
  abstract: string;
  has_fulltext: boolean;
  chunks: Chunk[];
}

/** Everything the 3D world needs, as loaded by `loadWorld()`. */
export interface WorldData {
  categories: Category[];
  ground: GroundLayout;
  tree: TreeNode[];
  vectors: VectorTable;
  vectorIds: string[];
}

/** Response of `GET /api/rag/health`. */
export interface HealthStatus {
  lancedb: boolean;
  llm: boolean;
  world: boolean;
}
