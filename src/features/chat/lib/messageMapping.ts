import type { GroundedChunk, PipelineTimings } from '../../../shared/types/rag';
import { uuidv7 } from '../../../shared/lib/uuid';
import type { LocalChatMessage } from '../db/chatDb';
import type { ChatMessage } from '../types';

/** A message of `GET /chat-sessions/:id/messages`. */
export interface RemoteMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: string[];
  grounded_chunks?: GroundedChunk[];
  timings?: PipelineTimings | null;
  created_at?: string;
}

export function remoteToLocalMessage(m: RemoteMessage, sessionId: string): LocalChatMessage {
  return {
    id: m.id || uuidv7(),
    sessionId,
    role: m.role,
    content: m.content,
    status: 'done',
    citationChecks: m.citations?.map((c) => ({ paper_id: c, status: 'verified' })),
    grounded_chunks: m.grounded_chunks,
    timings: m.timings,
    created_at: m.created_at || new Date().toISOString(),
  };
}

/** `runId` follows the position in the conversation (1-based). */
export function localToChatMessage(m: LocalChatMessage, index: number): ChatMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    runId: index + 1,
    status: m.status,
    expanded_terms: m.expanded_terms,
    citationChecks: m.citationChecks,
    grounded_chunks: m.grounded_chunks,
    timings: m.timings,
    error: m.error,
  };
}
