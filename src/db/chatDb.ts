import Dexie, { type Table } from 'dexie';
import type { CitationCheck, GroundedChunk, PipelineTimings } from '../types/rag';

export interface LocalChatSession {
  id: string; // UUIDv7
  userId?: string | null;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  message_count: number;
  synced?: boolean;
}

export interface LocalChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'streaming' | 'done' | 'error' | 'stopped';
  expanded_terms?: string[];
  citationChecks?: CitationCheck[];
  grounded_chunks?: GroundedChunk[];
  timings?: PipelineTimings | null;
  error?: string | null;
  created_at: string;
}

export class ChatDatabase extends Dexie {
  sessions!: Table<LocalChatSession, string>;
  messages!: Table<LocalChatMessage, string>;

  constructor() {
    super('RagChatDB');
    this.version(1).stores({
      sessions: 'id, userId, last_message_at, updated_at',
      messages: 'id, sessionId, role, created_at',
    });
  }
}

export const chatDb = new ChatDatabase();
