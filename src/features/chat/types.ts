import type { CitationCheck, GroundedChunk, PipelineTimings } from '../../shared/types/rag';

export type MessageStatus = 'streaming' | 'done' | 'error' | 'stopped';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  runId: number;
  status: MessageStatus;
  expanded_terms?: string[];
  citationChecks?: CitationCheck[];
  grounded_chunks?: GroundedChunk[];
  timings?: PipelineTimings | null;
  error?: string | null;
}
