import type {
  CitationCheck,
  CompareCandidate,
  GroundedChunk,
  PipelinePhase,
  PipelineTimings,
  RagStreamEvent,
  RouteStep,
} from '../types/rag';

export const PHASE_ORDER = ['idle', 'embedding', 'flying', 'comparing', 'found', 'generating', 'done'] as const satisfies readonly PipelinePhase[];

/** Data received so far for the question being answered. */
export interface RunData {
  query: string;
  route: RouteStep[];
  compare: CompareCandidate[];
  grounded_chunks: GroundedChunk[];
  expanded_terms: string[];
  answer: string;
  citations: string[];
  citationChecks: CitationCheck[];
  timings: PipelineTimings | null;
  error: string | null;
}

export interface PipelineState {
  phase: PipelinePhase;
  current: RunData;
}

export function emptyRun(query = ''): RunData {
  return { query, route: [], compare: [], grounded_chunks: [], expanded_terms: [], answer: '', citations: [], citationChecks: [], timings: null, error: null };
}

export function phaseIndex(p: PipelinePhase): number {
  return (PHASE_ORDER as readonly PipelinePhase[]).indexOf(p);
}

export function isValidTransition(from: PipelinePhase, to: PipelinePhase): boolean {
  if (to === 'error') return true;
  if ((from === 'done' || from === 'error') && to === 'embedding') return true;
  if (from === 'error') return false;
  return phaseIndex(to) > phaseIndex(from);
}

export function checkCitations(citations: readonly string[], chunks: readonly GroundedChunk[]): CitationCheck[] {
  const ids = new Set(chunks.map((c) => c.paper_id));
  return citations.map((paper_id) => ({ paper_id, status: ids.has(paper_id) ? 'verified' : 'unverified' }));
}

/** Pure reducer for one stream event; out-of-order or late events are ignored with a warning. */
export function reduceEvent(state: PipelineState, event: RagStreamEvent): PipelineState {
  const finished = state.phase === 'done' || state.phase === 'error';
  if (finished && !(event.type === 'phase' && event.phase === 'embedding')) {
    console.warn(`[pipeline] ignored "${event.type}" after ${state.phase}`);
    return state;
  }
  const cur = state.current;
  switch (event.type) {
    case 'phase':
      if (!isValidTransition(state.phase, event.phase)) {
        console.warn(`[pipeline] ignored transition ${state.phase} → ${event.phase}`);
        return state;
      }
      return { ...state, phase: event.phase };
    case 'route':
      return { ...state, current: { ...cur, route: event.steps } };
    case 'compare':
      return { ...state, current: { ...cur, compare: event.candidates } };
    case 'retrieval':
      return { ...state, current: { ...cur, grounded_chunks: event.grounded_chunks, expanded_terms: event.expanded_terms ?? [] } };
    case 'token':
      return { ...state, current: { ...cur, answer: cur.answer + event.text } };
    case 'done':
      return {
        phase: 'done',
        current: { ...cur, citations: event.citations, citationChecks: checkCitations(event.citations, cur.grounded_chunks), timings: event.timings },
      };
    case 'error':
      return { phase: 'error', current: { ...cur, error: event.message } };
  }
}

/** Next visual phase: one step forward, never past the data phase. */
export function advanceVisual(visual: PipelinePhase, phase: PipelinePhase): PipelinePhase {
  if (phase === 'error') return 'error';
  const v = phaseIndex(visual);
  const p = phaseIndex(phase);
  if (v < 0 || v >= p) return visual;
  return PHASE_ORDER[v + 1];
}
