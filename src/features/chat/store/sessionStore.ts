import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_BASE, USE_MOCK } from '../../../shared/api/config';
import { apiFetch, fetchAllPages } from '../../../shared/api/http';
import type { CitationCheck, GroundedChunk, PipelineTimings } from '../../../shared/types/rag';
import { chatDb, listLocalSessions, type LocalChatMessage, type LocalChatSession } from '../db/chatDb';
import { localToChatMessage, remoteToLocalMessage, type RemoteMessage } from '../lib/messageMapping';
import { useRag } from './ragStore';
import { useAuth } from '../../auth/authStore';
import { uuidv7 } from '../../../shared/lib/uuid';

const SYNC_PAGE_SIZE = '50';
const MESSAGE_PAGE_SIZE = '100';
/** Safety bounds of a sync: 500 sessions, 2000 messages. */
const MAX_SESSION_PAGES = 10;
const MAX_MESSAGE_PAGES = 20;
const SYNC_REQUEST_TIMEOUT_MS = 4000;

const syncRequest = () => ({ signal: AbortSignal.timeout(SYNC_REQUEST_TIMEOUT_MS) });

/** Remote sessions into Dexie: only those new or changed since the local copy. */
async function pullRemoteSessions(userId: string | null): Promise<void> {
  const remote = await fetchAllPages<LocalChatSession>(
    '/chat-sessions',
    { limit: SYNC_PAGE_SIZE },
    MAX_SESSION_PAGES,
    syncRequest,
  );
  for (const item of remote) {
    const existing = await chatDb.sessions.get(item.id);
    if (!existing || new Date(item.updated_at) > new Date(existing.updated_at)) {
      await chatDb.sessions.put({
        id: item.id,
        userId,
        title: item.title,
        created_at: item.created_at,
        updated_at: item.updated_at,
        last_message_at: item.last_message_at,
        message_count: item.message_count,
        synced: true,
      });
    }
  }
}

interface SessionState {
  currentSessionId: string | null;
  sessions: LocalChatSession[];
  isHistoryOpen: boolean;
  isOffline: boolean;
  isLoading: boolean;

  init: () => Promise<void>;
  toggleHistory: (open?: boolean) => void;
  startNewChat: () => void;
  switchSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  createOrGetSession: (firstQuery: string) => Promise<string>;
  saveExchangeToDb: (
    sessionId: string,
    userMsg: { id: string; content: string; created_at: string },
    assistantMsg: {
      id: string;
      content: string;
      status: 'done' | 'error' | 'stopped';
      citationChecks?: CitationCheck[];
      grounded_chunks?: GroundedChunk[];
      timings?: PipelineTimings | null;
      error?: string | null;
      created_at: string;
    },
  ) => Promise<void>;
  confirmBackendSession: (localId: string, backendId: string) => Promise<void>;
  checkBackendHealth: () => Promise<boolean>;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      currentSessionId: null,
      sessions: [],
      isHistoryOpen: false,
      isOffline: false,
      isLoading: false,

      checkBackendHealth: async () => {
        if (USE_MOCK) {
          set({ isOffline: false });
          return true;
        }
        try {
          const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
          const ok = res.ok;
          set({ isOffline: !ok });
          return ok;
        } catch {
          set({ isOffline: true });
          return false;
        }
      },

      init: async () => {
        set({ isLoading: true });
        try {
          // 1. Load local sessions from Dexie first (instant cache)
          const localSessions = await listLocalSessions();
          set({ sessions: localSessions });

          // 2. Health check backend in background
          const isAlive = await get().checkBackendHealth();

          // 3. If online & authenticated, sync remote sessions
          const token = useAuth.getState().accessToken;
          const user = useAuth.getState().user;
          if (isAlive && token && !USE_MOCK) {
            try {
              await pullRemoteSessions(user?.id ?? null);
              const merged = await listLocalSessions();
              set({ sessions: merged });
            } catch (err) {
              console.warn('[sessionStore] Remote sync failed, continuing offline:', err);
            }
          }

          // 4. Rehydrate active conversation
          const { currentSessionId, sessions } = get();
          const targetId = currentSessionId && sessions.some((s) => s.id === currentSessionId)
            ? currentSessionId
            : sessions.length > 0
            ? sessions[0].id
            : null;

          if (targetId) {
            await get().switchSession(targetId);
          } else {
            get().startNewChat();
          }
        } finally {
          set({ isLoading: false });
        }
      },

      toggleHistory: (open) => {
        set((s) => ({ isHistoryOpen: open ?? !s.isHistoryOpen }));
      },

      startNewChat: () => {
        set({ currentSessionId: null, isHistoryOpen: false });
        useRag.getState().clearMessages();
      },

      switchSession: async (sessionId: string) => {
        set({ currentSessionId: sessionId, isHistoryOpen: false });

        // Load messages from Dexie
        const localMsgs = await chatDb.messages
          .where('sessionId')
          .equals(sessionId)
          .sortBy('created_at');

        if (localMsgs.length > 0) {
          useRag.getState().loadMessages(localMsgs.map(localToChatMessage));
          return;
        }

        // If local had no messages but user is online & authenticated, try fetching from backend
        const token = useAuth.getState().accessToken;
        if (token && !USE_MOCK && !get().isOffline) {
          try {
            const remote = await fetchAllPages<RemoteMessage>(
              `/chat-sessions/${sessionId}/messages`,
              { limit: MESSAGE_PAGE_SIZE },
              MAX_MESSAGE_PAGES,
              syncRequest,
            );
            const localRemote = remote.map((m) => remoteToLocalMessage(m, sessionId));
            for (const m of localRemote) await chatDb.messages.put(m);
            useRag.getState().loadMessages(localRemote.map(localToChatMessage));
            return;
          } catch (err) {
            console.warn('[sessionStore] Remote session fetch failed:', err);
          }
        }

        // Fallback: empty chat
        useRag.getState().clearMessages();
      },

      deleteSession: async (sessionId: string) => {
        // 1. Delete locally from IndexedDB
        await chatDb.messages.where('sessionId').equals(sessionId).delete();
        await chatDb.sessions.delete(sessionId);

        // 2. Refresh local state
        const remaining = await listLocalSessions();
        set({ sessions: remaining });

        // 3. If active session was deleted, switch to first remaining or start new chat
        if (get().currentSessionId === sessionId) {
          if (remaining.length > 0) {
            await get().switchSession(remaining[0].id);
          } else {
            get().startNewChat();
          }
        }

        // 4. Background delete on backend
        const token = useAuth.getState().accessToken;
        if (token && !USE_MOCK && !get().isOffline) {
          apiFetch(`/chat-sessions/${sessionId}`, { method: 'DELETE' }).catch((err) => console.warn('[sessionStore] Remote delete failed:', err));
        }
      },

      createOrGetSession: async (firstQuery: string) => {
        const currentId = get().currentSessionId;
        if (currentId) return currentId;

        const title = firstQuery.trim().slice(0, 48) || 'Đoạn chat mới';
        const now = new Date().toISOString();
        const sessionId = uuidv7();
        const user = useAuth.getState().user;

        const newSession: LocalChatSession = {
          id: sessionId,
          userId: user?.id ?? null,
          title,
          created_at: now,
          updated_at: now,
          last_message_at: now,
          message_count: 0,
          synced: false,
        };

        await chatDb.sessions.put(newSession);
        const updatedSessions = await listLocalSessions();
        set({
          currentSessionId: sessionId,
          sessions: updatedSessions,
        });

        return sessionId;
      },

      confirmBackendSession: async (localId: string, backendId: string) => {
        if (!backendId) return;
        const session = await chatDb.sessions.get(localId);
        if (!session) return;

        const user = useAuth.getState().user;
        const token = useAuth.getState().accessToken;

        if (localId !== backendId) {
          // 1. Migrate local messages to the backend session id
          const localMsgs = await chatDb.messages.where('sessionId').equals(localId).toArray();
          for (const m of localMsgs) {
            await chatDb.messages.delete(m.id);
            await chatDb.messages.put({ ...m, sessionId: backendId });
          }
          // 2. Replace local session with confirmed backend session
          await chatDb.sessions.delete(localId);
          await chatDb.sessions.put({
            ...session,
            id: backendId,
            userId: user?.id ?? session.userId,
            synced: true,
          });
          set((s) => ({
            currentSessionId: s.currentSessionId === localId ? backendId : s.currentSessionId,
          }));
        } else {
          await chatDb.sessions.update(backendId, { synced: true });
        }

        const updatedSessions = await listLocalSessions();
        set({ sessions: updatedSessions });

        // 3. Sync prompt title to backend via PATCH /chat-sessions/:id
        if (token && !USE_MOCK && session.title) {
          apiFetch(`/chat-sessions/${backendId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: session.title }),
          }).catch((err) => console.warn('[sessionStore] Remote title sync failed:', err));
        }
      },

      saveExchangeToDb: async (sessionId, userMsg, assistantMsg) => {
        const nowMs = Date.now();
        const now = new Date(nowMs).toISOString();
        const userTime = userMsg.created_at || now;
        let assistantTime = assistantMsg.created_at || new Date(nowMs + 1).toISOString();
        if (new Date(assistantTime) <= new Date(userTime)) {
          assistantTime = new Date(new Date(userTime).getTime() + 1).toISOString();
        }

        const userLocal: LocalChatMessage = {
          id: userMsg.id,
          sessionId,
          role: 'user',
          content: userMsg.content,
          status: 'done',
          created_at: userTime,
        };

        const assistantLocal: LocalChatMessage = {
          id: assistantMsg.id,
          sessionId,
          role: 'assistant',
          content: assistantMsg.content,
          status: assistantMsg.status,
          citationChecks: assistantMsg.citationChecks,
          grounded_chunks: assistantMsg.grounded_chunks,
          timings: assistantMsg.timings,
          error: assistantMsg.error,
          created_at: assistantTime,
        };

        await chatDb.messages.bulkPut([userLocal, assistantLocal]);

        // Update session last_message_at and message_count
        const session = await chatDb.sessions.get(sessionId);
        if (session) {
          const count = await chatDb.messages.where('sessionId').equals(sessionId).count();
          await chatDb.sessions.update(sessionId, {
            last_message_at: now,
            updated_at: now,
            message_count: count,
          });
          const updatedSessions = await listLocalSessions();
          set({ sessions: updatedSessions });
        }
      },
    }),
    {
      name: 'rag-session-storage',
      partialize: (state) => ({
        currentSessionId: state.currentSessionId,
      }),
    },
  ),
);
