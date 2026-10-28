import { AlertTriangle, CheckCircle2, CircleSlash } from 'lucide-react';
import { useEffect, useMemo, useState, startTransition } from 'react';
import { phaseIndex } from '../../store/pipeline';
import { useRag, type ChatMessage } from '../../store/ragStore';
import type { FocusContext } from '../../store/uiStore';
import { Markdown } from './Markdown';

const VISUAL_LABEL: Record<string, string> = {
  idle: 'Đang gửi câu hỏi…',
  embedding: 'Đang vector hóa câu hỏi…',
  flying: 'Quả cầu đang bay theo cành…',
  comparing: 'Đang so sánh vector trong tán lá…',
  found: 'Đã tìm thấy các vector gần nhất…',
};

type RevealMode = 'hidden' | 'reveal' | 'full';

/** Typewriter: nothing while 'hidden', catches up progressively in 'reveal', everything in 'full'. */
function useReveal(text: string, mode: RevealMode): string {
  const [shown, setShown] = useState(mode === 'full' ? text.length : 0);
  useEffect(() => {
    if (mode !== 'reveal') {
      setShown(mode === 'full' ? text.length : 0);
      return;
    }
    const id = setInterval(() => {
      startTransition(() => {
        setShown((n) => (n >= text.length ? n : Math.min(text.length, n + Math.max(3, Math.ceil((text.length - n) / 45)))));
      });
    }, 45);
    return () => clearInterval(id);
  }, [text, mode]);
  return mode === 'full' ? text : text.slice(0, Math.min(shown, text.length));
}

interface Props {
  message: ChatMessage;
  /** Expanded query terms of the matching answer, shown under the question. */
  expandedTerms?: string[];
}

export function MessageBubble({ message, expandedTerms }: Props) {
  if (message.role === 'user') {
    return (
      <div className="flex flex-col items-end gap-1 fade-in">
        <div className="max-w-[88%] rounded-2xl rounded-br-md px-3.5 py-2 text-sm bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] border border-[color-mix(in_srgb,var(--accent)_35%,transparent)] whitespace-pre-wrap">
          {message.content}
        </div>
        {expandedTerms && expandedTerms.length > 0 && (
          <div className="flex flex-wrap justify-end gap-1 max-w-[88%]" aria-label="Từ khóa mở rộng">
            {expandedTerms.map((t) => (
              <span key={t} className="tag">
                + {t}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }
  return <AssistantBubble message={message} />;
}

function AssistantBubble({ message }: { message: ChatMessage }) {
  const runId = useRag((s) => s.runId);
  const visual = useRag((s) => s.visualPhase);
  const isCurrent = message.runId === runId;
  // Text appears once the animation reaches "generating", so chat and 3D stay in sync.
  const isFinished = message.status === 'done' || message.status === 'stopped' || message.status === 'error';
  const gated = isCurrent && !isFinished && phaseIndex(visual) >= 0 && phaseIndex(visual) < phaseIndex('generating');
  const streaming = isCurrent && !isFinished && (message.status === 'streaming' || visual === 'generating');
  const text = useReveal(message.content, isFinished || !isCurrent ? 'full' : gated ? 'hidden' : 'reveal');
  const context: FocusContext = useMemo(
    () => ({ citationChecks: message.citationChecks ?? [], grounded: message.grounded_chunks ?? [] }),
    [message.citationChecks, message.grounded_chunks],
  );
  const checks = message.citationChecks ?? [];
  const verified = checks.filter((c) => c.status === 'verified').length;
  const unverified = checks.length - verified;

  return (
    <div className="flex flex-col gap-1.5 fade-in" data-testid="assistant-message" data-status={message.status}>
      <div className="rounded-2xl rounded-bl-md px-3.5 py-2.5 bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] border border-[var(--ui-border)]">
        {gated || (text === '' && message.status === 'streaming') ? (
          <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)] py-1">
            <span className="typing" aria-hidden>
              <span />
              <span />
              <span />
            </span>
            {VISUAL_LABEL[visual] ?? 'Đang sinh câu trả lời…'}
          </div>
        ) : (
          <Markdown
            text={text}
            checks={checks}
            context={context}
            streaming={streaming}
            className={streaming && (message.status === 'streaming' || text.length < message.content.length) ? 'caret' : ''}
          />
        )}
        {message.status === 'error' && (
          <div role="alert" className="mt-2 flex items-start gap-2 text-xs text-[var(--danger)]">
            <AlertTriangle size={14} className="mt-0.5 flex-none" /> {message.error ?? 'Đã có lỗi xảy ra.'}
          </div>
        )}
        {message.status === 'stopped' && (
          <div className="mt-2 flex items-center gap-2 text-xs text-[var(--ink-muted)]">
            <CircleSlash size={13} /> Đã dừng
          </div>
        )}
      </div>
      {message.status === 'done' && checks.length > 0 && !gated && (
        <div className="flex flex-wrap items-center gap-2 px-1 text-[0.7rem] text-[var(--ink-muted)]">
          <span className="inline-flex items-center gap-1 text-[var(--success)]">
            <CheckCircle2 size={12} /> {verified} trích dẫn xác minh
          </span>
          {unverified > 0 && (
            <span className="inline-flex items-center gap-1 text-[var(--warn)]">
              <AlertTriangle size={12} /> {unverified} ngoài ngữ cảnh
            </span>
          )}
          {message.timings && <span className="mono ml-auto">{message.timings.total_ms} ms</span>}
        </div>
      )}
    </div>
  );
}
