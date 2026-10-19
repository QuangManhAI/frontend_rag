import { FastForward } from 'lucide-react';
import { phaseIndex } from '../../store/pipeline';
import { useRag } from '../../store/ragStore';
import type { PipelinePhase, PipelineTimings } from '../../types/rag';

const STEPS: ReadonlyArray<{ phase: PipelinePhase; label: string; timing: keyof PipelineTimings }> = [
  { phase: 'embedding', label: 'Vector hóa câu hỏi', timing: 'embed_ms' },
  { phase: 'flying', label: 'Bay theo cành', timing: 'route_ms' },
  { phase: 'comparing', label: 'So sánh vector', timing: 'search_ms' },
  { phase: 'found', label: 'Tìm thấy', timing: 'rerank_ms' },
  { phase: 'generating', label: 'Sinh câu trả lời', timing: 'llm_ms' },
  { phase: 'done', label: 'Xong', timing: 'total_ms' },
];

/** Six-step progress driven by visualPhase so it matches the 3D animation. */
export function PipelineStatus() {
  const visual = useRag((s) => s.visualPhase);
  const phase = useRag((s) => s.phase);
  const timings = useRag((s) => s.current.timings);
  const errorAt = useRag((s) => s.current.error);
  if (visual === 'idle' && phase === 'idle') return null;
  const vi = phaseIndex(visual);
  const failed = visual === 'error';
  const running = !failed && visual !== 'done';
  const showTimings = visual === 'done' && timings;

  return (
    <div className="px-4 py-3 border-b border-[var(--ui-border)]" data-testid="pipeline-status" data-visual-phase={visual}>
      <ol className="grid grid-cols-3 gap-x-3 gap-y-1.5" aria-label="Tiến trình truy xuất">
        {STEPS.map((s) => {
          const si = phaseIndex(s.phase);
          const state = failed ? 'pending' : si < vi || visual === 'done' ? 'done' : si === vi ? 'active' : 'pending';
          return (
            <li key={s.phase} className="step" data-state={state} aria-current={state === 'active' ? 'step' : undefined}>
              <span className="step-dot" aria-hidden />
              <span className="truncate">{s.label}</span>
              {showTimings && <span className="mono ml-auto text-[0.65rem] text-[var(--ink-muted)]">{timings[s.timing]}ms</span>}
            </li>
          );
        })}
      </ol>
      <div className="flex items-center gap-2 mt-2 min-h-6">
        {failed && <span className="text-xs text-[var(--danger)]">✕ {errorAt ?? 'Lỗi'}</span>}
        {running && (
          <button type="button" className="btn ml-auto !py-0.5 !text-[0.7rem]" onClick={() => useRag.getState().skipAnimation()}>
            <FastForward size={12} /> Bỏ qua animation
          </button>
        )}
      </div>
    </div>
  );
}
