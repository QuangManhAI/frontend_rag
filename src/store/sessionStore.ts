import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_BASE, USE_MOCK } from '../api/client';
import { chatDb, type LocalChatMessage, type LocalChatSession } from '../db/chatDb';
import type { ChatMessage } from './ragStore';
import { useRag } from './ragStore';
import { useAuth } from './authStore';
import { uuidv7 } from '../utils/uuid';

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
      citationChecks?: any[];
      grounded_chunks?: any[];
      timings?: any;
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
          const localSessions = await chatDb.sessions.orderBy('last_message_at').reverse().toArray();
          set({ sessions: localSessions });

          // 2. Health check backend in background
          const isAlive = await get().checkBackendHealth();

          // 3. If online & authenticated, sync remote sessions
          const token = useAuth.getState().accessToken;
          const user = useAuth.getState().user;
          if (isAlive && token && !USE_MOCK) {
            try {
              const res = await fetch(`${API_BASE}/chat-sessions?limit=50`, {
                headers: { Authorization: `Bearer ${token}` },
                signal: AbortSignal.timeout(4000),
              });
              if (res.ok) {
                const data = (await res.json()) as { items?: LocalChatSession[] };
                if (Array.isArray(data.items)) {
                  for (const item of data.items) {
                    const existing = await chatDb.sessions.get(item.id);
                    if (!existing || new Date(item.updated_at) > new Date(existing.updated_at)) {
                      await chatDb.sessions.put({
                        id: item.id,
                        userId: user?.id ?? null,
                        title: item.title,
                        created_at: item.created_at,
                        updated_at: item.updated_at,
                        last_message_at: item.last_message_at,
                        message_count: item.message_count,
                        synced: true,
                      });
                    }
                  }
                  const merged = await chatDb.sessions.orderBy('last_message_at').reverse().toArray();
                  set({ sessions: merged });
                }
              }
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
          const storeMsgs: ChatMessage[] = localMsgs.map((m, idx) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            runId: idx + 1,
            status: m.status,
            expanded_terms: m.expanded_terms,
            citationChecks: m.citationChecks,
            grounded_chunks: m.grounded_chunks,
            timings: m.timings,
            error: m.error,
          }));
          useRag.getState().loadMessages(storeMsgs);
          return;
        }

        // If local had no messages but user is online & authenticated, try fetching from backend
        const token = useAuth.getState().accessToken;
        if (token && !USE_MOCK && !get().isOffline) {
          try {
            const res = await fetch(`${API_BASE}/chat-sessions/${sessionId}`, {
              headers: { Authorization: `Bearer ${token}` },
              signal: AbortSignal.timeout(4000),
            });
            if (res.ok) {
              const remote = await res.json();
              if (Array.isArray(remote.messages)) {
                const storeMsgs: ChatMessage[] = [];
                for (let i = 0; i < remote.messages.length; i++) {
                  const m = remote.messages[i];
                  const localMsg: LocalChatMessage = {
                    id: m.id || uuidv7(),
                    sessionId,
                    role: m.role,
                    content: m.content,
                    status: 'done',
                    citationChecks: m.citations?.map((c: string) => ({ marker: c, paper_id: c, status: 'verified' })),
                    grounded_chunks: m.grounded_chunks,
                    timings: m.timings,
                    created_at: m.created_at || new Date().toISOString(),
                  };
                  await chatDb.messages.put(localMsg);
                  storeMsgs.push({
                    id: localMsg.id,
                    role: localMsg.role,
                    content: localMsg.content,
                    runId: i + 1,
                    status: 'done',
                    citationChecks: localMsg.citationChecks,
                    grounded_chunks: localMsg.grounded_chunks,
                    timings: localMsg.timings,
                  });
                }
                useRag.getState().loadMessages(storeMsgs);
                return;
              }
            }
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
        const remaining = await chatDb.sessions.orderBy('last_message_at').reverse().toArray();
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
          fetch(`${API_BASE}/chat-sessions/${sessionId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          }).catch((err) => console.warn('[sessionStore] Remote delete failed:', err));
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
        const updatedSessions = await chatDb.sessions.orderBy('last_message_at').reverse().toArray();
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

        const updatedSessions = await chatDb.sessions.orderBy('last_message_at').reverse().toArray();
        set({ sessions: updatedSessions });

        // 3. Sync prompt title to backend via PATCH /chat-sessions/:id
        if (token && !USE_MOCK && session.title) {
          fetch(`${API_BASE}/chat-sessions/${backendId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
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
          const updatedSessions = await chatDb.sessions.orderBy('last_message_at').reverse().toArray();
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
