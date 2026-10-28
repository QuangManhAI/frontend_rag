import { create } from 'zustand';
import { MOCK_WORLD, streamChat, USE_MOCK } from '../api/client';
import { bridgeStream, WorldBridge } from '../api/worldBridge';
import type { CitationCheck, GroundedChunk, PipelinePhase, PipelineTimings, RagRequest, RagStreamEvent } from '../types/rag';
import { advanceVisual, emptyRun, reduceEvent, type RunData } from './pipeline';
import { useUi } from './uiStore';
import { useWorld } from './worldStore';
import { useSessionStore } from './sessionStore';
import { uuidv7 } from '../utils/uuid';
import { chatDb } from '../db/chatDb';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  runId: number;
  status: 'streaming' | 'done' | 'error' | 'stopped';
  expanded_terms?: string[];
  citationChecks?: CitationCheck[];
  grounded_chunks?: GroundedChunk[];
  timings?: PipelineTimings | null;
  error?: string | null;
}

interface RagState {
  messages: ChatMessage[];
  phase: PipelinePhase;
  visualPhase: PipelinePhase;
  current: RunData;
  runId: number;
  /** True once the user skipped the animation for this run: remaining stages show instantly. */
  skipped: boolean;
  /** Bumped by skipAnimation() so the flight finishes its current stage at once. */
  skipToken: number;
  send: (text: string) => Promise<void>;
  stop: () => void;
  advanceVisual: () => void;
  skipAnimation: () => void;
  clearMessages: () => void;
  loadMessages: (messages: ChatMessage[]) => void;
}

let controller: AbortController | null = null;

/** Real backend on the mock world: one bridge for the session so a paper keeps its vector. */
let bridge: WorldBridge | null = null;
function chatEvents(req: RagRequest, signal: AbortSignal): AsyncIterable<RagStreamEvent> {
  const events = streamChat(req, signal);
  if (USE_MOCK || !MOCK_WORLD) return events;
  const world = useWorld.getState();
  if (world.status !== 'ready' || !world.vectors) return events;
  if (!bridge) {
    console.info('[bridge] real backend on the mock world: papers are placed on stand-in vectors');
    bridge = new WorldBridge(() => {
      const w = useWorld.getState();
      return {
        vectors: w.vectors!,
        nodesById: w.nodesById,
        childrenById: w.childrenById,
        vectorIndexByPaperId: w.vectorIndexByPaperId,
        vectorIds: w.vectorIds,
      };
    });
  }
  return bridgeStream(events, bridge, req.nprobe ?? 2);
}

export const useRag = create<RagState>((set, get) => {
  const patchAssistant = (runId: number, patch: Partial<ChatMessage>) =>
    set((s) => ({ messages: s.messages.map((m) => (m.role === 'assistant' && m.runId === runId ? { ...m, ...patch } : m)) }));

  const dispatch = (runId: number, event: RagStreamEvent) => {
    const s = get();
    if (s.runId !== runId) return;
    const next = reduceEvent({ phase: s.phase, current: s.current }, event);
    if (next.phase === s.phase && next.current === s.current) return;
    let visualPhase = s.visualPhase;
    if (next.phase === 'error') visualPhase = 'error';
    else if (visualPhase === 'idle' && next.phase !== 'idle') visualPhase = 'embedding';

    // Batch message update with state update into a single set() call to eliminate double render passes per token
    if (event.type === 'token') {
      set((st) => ({
        phase: next.phase,
        current: next.current,
        visualPhase,
        messages: st.messages.map((m) => (m.role === 'assistant' && m.runId === runId ? { ...m, content: next.current.answer } : m)),
      }));
      return;
    }

    set({ phase: next.phase, current: next.current, visualPhase });
    if (event.type === 'retrieval') patchAssistant(runId, { expanded_terms: next.current.expanded_terms, grounded_chunks: next.current.grounded_chunks });
    if (next.phase === 'done' && s.phase !== 'done') {
      patchAssistant(runId, { status: 'done', content: next.current.answer, citationChecks: next.current.citationChecks, timings: next.current.timings });
    }
    if (next.phase === 'error' && s.phase !== 'error') patchAssistant(runId, { status: 'error', error: next.current.error });
  };

  return {
    messages: [],
    phase: 'idle',
    visualPhase: 'idle',
    current: emptyRun(),
    runId: 0,
    skipped: false,
    skipToken: 0,

    clearMessages: () => {
      controller?.abort();
      controller = null;
      set({
        messages: [],
        phase: 'idle',
        visualPhase: 'idle',
        current: emptyRun(),
        runId: 0,
      });
    },

    loadMessages: (messages: ChatMessage[]) => {
      controller?.abort();
      controller = null;
      const maxRunId = messages.reduce((max, m) => Math.max(max, m.runId), 0);
      set({
        messages,
        phase: 'done',
        visualPhase: 'done',
        current: emptyRun(),
        runId: maxRunId + 1,
      });
    },

    send: async (text) => {
      const query = text.trim();
      if (!query) return;
      controller?.abort();
      const ctrl = new AbortController();
      controller = ctrl;
      const runId = get().runId + 1;
      const st = useUi.getState().settings;

      const userMsgId = uuidv7();
      const assistantMsgId = uuidv7();

      set((s) => ({
        runId,
        phase: 'idle',
        visualPhase: 'idle',
        skipped: st.reduceMotion,
        current: emptyRun(query),
        messages: [
          ...s.messages.map((m) => (m.status === 'streaming' ? { ...m, status: 'stopped' as const } : m)),
          { id: userMsgId, role: 'user', content: query, runId, status: 'done' },
          { id: assistantMsgId, role: 'assistant', content: '', runId, status: 'streaming' },
        ],
      }));

      // Ensure active session exists in sessionStore & Dexie (offline-first)
      const sessionId = await useSessionStore.getState().createOrGetSession(query);
      if (ctrl.signal.aborted) return;

      const session = await chatDb.sessions.get(sessionId);
      const req: RagRequest = {
        query,
        top_k: st.top_k,
        nprobe: st.nprobe,
        use_authority_boost: st.use_authority_boost,
        expand_query: st.expand_query,
        ...(st.category ? { category: st.category } : {}),
        ...(session?.synced ? { session_id: sessionId } : {}),
      };

      try {
        for await (const ev of chatEvents(req, ctrl.signal)) {
          if (controller !== ctrl) return;
          if (ev.type === 'done' && ev.session_id) {
            await useSessionStore.getState().confirmBackendSession(sessionId, ev.session_id);
          }
          dispatch(runId, ev);
        }
      } catch (err) {
        dispatch(runId, { type: 'error', message: (err as Error).message });
      } finally {
        const s = get();
        if (s.runId === runId && !ctrl.signal.aborted && s.phase !== 'done' && s.phase !== 'error') {
          dispatch(runId, { type: 'error', message: 'Stream kết thúc trước khi có kết quả.' });
        }

        // Persist exchange to IndexedDB (Dexie)
        const finalS = get();
        const userMsg = finalS.messages.find((m) => m.id === userMsgId);
        const assistantMsg = finalS.messages.find((m) => m.id === assistantMsgId);
        const targetSessionId = useSessionStore.getState().currentSessionId || sessionId;
        if (userMsg && assistantMsg && targetSessionId) {
          const finalStatus = assistantMsg.status === 'streaming' ? 'stopped' : assistantMsg.status;
          void useSessionStore.getState().saveExchangeToDb(
            targetSessionId,
            { id: userMsg.id, content: userMsg.content, created_at: new Date().toISOString() },
            {
              id: assistantMsg.id,
              content: assistantMsg.content,
              status: finalStatus,
              citationChecks: assistantMsg.citationChecks,
              grounded_chunks: assistantMsg.grounded_chunks,
              timings: assistantMsg.timings,
              error: assistantMsg.error,
              created_at: new Date().toISOString(),
            },
          );
        }
      }
    },

    stop: () => {
      const s = get();
      if (s.phase === 'done' || s.phase === 'error' || s.phase === 'idle') return;
      controller?.abort();
      controller = null;
      set({ phase: 'error', visualPhase: 'error', current: { ...s.current, error: 'Đã dừng.' } });
      patchAssistant(s.runId, { status: 'stopped' });

      // Save stopped state to Dexie
      const currentSessionId = useSessionStore.getState().currentSessionId;
      const currentAssistant = s.messages.find((m) => m.role === 'assistant' && m.runId === s.runId);
      const currentUser = s.messages.find((m) => m.role === 'user' && m.runId === s.runId);
      if (currentSessionId && currentAssistant && currentUser) {
        void useSessionStore.getState().saveExchangeToDb(
          currentSessionId,
          { id: currentUser.id, content: currentUser.content, created_at: new Date().toISOString() },
          {
            id: currentAssistant.id,
            content: currentAssistant.content,
            status: 'stopped',
            citationChecks: currentAssistant.citationChecks,
            grounded_chunks: currentAssistant.grounded_chunks,
            timings: currentAssistant.timings,
            error: 'Đã dừng.',
            created_at: new Date().toISOString(),
          },
        );
      }
    },

    advanceVisual: () => {
      const s = get();
      const v = advanceVisual(s.visualPhase, s.phase);
      if (v !== s.visualPhase) set({ visualPhase: v });
    },

    skipAnimation: () => set((s) => ({ visualPhase: s.phase, skipped: true, skipToken: s.skipToken + 1 })),
  };
});
