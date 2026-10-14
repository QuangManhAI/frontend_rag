export interface GroundedChunkResult {
  chunk_id: string;
  paper_id: string;
  title: string;
  authors?: string[];
  primary_category?: string;
  section_title?: string;
  text: string;
  similarity_score: number;
  authority_score: number;
  final_score: number;
  citation_tag: string;
}

export interface RAGSynthesisResponse {
  query: string;
  answer: string;
  citations: string[];
  grounded_chunks: GroundedChunkResult[];
  latency_ms: number;
}

export interface GpuStatus {
  hasGpu: boolean;
  type: string;
  platform: string;
  arch: string;
  details: string;
  nodeLlamaGpuOption: string | boolean;
}

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
  components: {
    vectorStore: string;
    llm: string;
    gpu: GpuStatus | null;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: string[];
  grounded_chunks?: GroundedChunkResult[];
  latency_ms?: number;
}

export interface QueryOptions {
  top_k: number;
  category?: string;
  use_authority_boost: boolean;
  expand_query: boolean;
}
