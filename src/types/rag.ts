import type { SectionType } from './world';

/** Body of `POST /api/v1/rag/chat/stream`. */
export interface RagRequest {
  query: string;
  top_k?: number;
  nprobe?: number;
  category?: string;
  use_authority_boost?: boolean;
  expand_query?: boolean;
  session_id?: string;
}

/** A chunk retrieved as context for the answer, with real backend scores. */
export interface GroundedChunk {
  chunk_id: string;
  paper_id: string;
  title: string;
  section_title: string;
  section_type: SectionType;
  text: string;
  similarity_score: number;
  authority_score: number;
  final_score: number;
  citation_tag: string;
}

/** Cosine score of the query against one tree node centroid. */
export interface RouteCandidate {
  node_id: number;
  score: number;
}

/** One routing decision at a tree depth: all candidates and the chosen ids. */
export interface RouteStep {
  depth: 1 | 2;
  candidates: RouteCandidate[];
  chosen: number[];
}

/** A paper vector compared against the query inside the chosen twigs. */
export interface CompareCandidate {
  paper_id: string;
  score: number;
}

/** Pipeline stage, shared by data (`phase`) and animation (`visualPhase`). */
export type PipelinePhase = 'idle' | 'embedding' | 'flying' | 'comparing' | 'found' | 'generating' | 'done' | 'error';

/** Stage durations reported by the backend, in milliseconds. */
export interface PipelineTimings {
  embed_ms: number;
  route_ms: number;
  search_ms: number;
  rerank_ms: number;
  llm_ms: number;
  total_ms: number;
}

/** Phases the backend can announce over SSE. */
export type StreamPhase = 'embedding' | 'flying' | 'comparing' | 'found' | 'generating';

/** One SSE event of the chat stream, discriminated by `type`. */
export type RagStreamEvent =
  | { type: 'phase'; phase: StreamPhase }
  | { type: 'route'; steps: RouteStep[] }
  | { type: 'compare'; candidates: CompareCandidate[] }
  | { type: 'retrieval'; grounded_chunks: GroundedChunk[]; expanded_terms?: string[] }
  | { type: 'token'; text: string }
  | { type: 'done'; citations: string[]; timings: PipelineTimings; session_id?: string | null; message_id?: string | null }
  | { type: 'error'; message: string; status?: number };

/** Whether a cited paper was actually among the retrieved context. */
export interface CitationCheck {
  paper_id: string;
  status: 'verified' | 'unverified';
}
