import { Sparkles } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useRag } from '../../store/ragStore';
import { MessageBubble } from './MessageBubble';

const SAMPLES = [
  'LoRA giúp fine-tune transformer hiệu quả như thế nào?',
  'Các phương pháp dense retrieval và reranking cho RAG?',
  'Diffusion model trong segmentation ảnh y tế',
  'Sim2real cho robot manipulation',
  'Thử lỗi /error',
];

export function MessageList() {
  const messages = useRag((s) => s.messages);
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  // Auto-scroll while streaming via requestAnimationFrame to avoid forced synchronous reflows
  useEffect(() => {
    const el = scroller.current;
    if (!el || !pinned.current) return;
    const rafId = requestAnimationFrame(() => {
      if (el && pinned.current) {
        el.scrollTop = el.scrollHeight;
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto scroll-thin px-4 py-5 flex flex-col gap-4">
        <div className="text-sm text-[var(--ink-muted)] leading-relaxed">
          <p className="text-[var(--ink)] font-medium flex items-center gap-2 mb-1">
            <Sparkles size={15} className="text-[var(--accent)]" /> Hỏi cây tri thức
          </p>
          Mỗi điểm sáng trên tán là một bài báo. Gửi câu hỏi để xem quả cầu vector bay theo cành, so sánh và tìm ra các bài gần nhất.
        </div>
        <div className="flex flex-col gap-2">
          {SAMPLES.map((q) => (
            <button key={q} type="button" className="btn justify-start text-left !font-normal" onClick={() => void useRag.getState().send(q)}>
              {q}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scroller}
      className="flex-1 overflow-y-auto scroll-thin px-4 py-4 flex flex-col gap-4"
      onScroll={(e) => {
        const el = e.currentTarget;
        pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      }}
    >
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} expandedTerms={m.role === 'user' ? undefined : m.expanded_terms} />
      ))}
    </div>
  );
}
