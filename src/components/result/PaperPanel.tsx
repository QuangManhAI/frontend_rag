import { AlertTriangle, CheckCircle2, ExternalLink, Info, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useUi } from '../../store/uiStore';
import { useWorld } from '../../store/worldStore';
import { categoryColor } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { toArxivUrl } from '../../utils/arxiv';
import { resolveResultCase } from '../../utils/resultCase';
import { Markdown } from '../chat/Markdown';
import { ChunkList } from './ChunkList';
import { usePaper } from './usePaper';

export const UNVERIFIED_WARNING = 'LLM trích dẫn một bài không có trong ngữ cảnh đã truy xuất';
export const BROWSE_NOTE = 'Không được dùng cho câu trả lời này';
export const USED_NOTE = 'Đã dùng cho câu trả lời';

/** Right-hand paper detail panel with the three cases: grounded / browse / unverified. */
export function PaperPanel() {
  const paperId = useUi((s) => s.panelPaperId);
  if (!paperId) return null;
  return <PaperPanelBody key={paperId} paperId={paperId} />;
}

function PaperPanelBody({ paperId }: { paperId: string }) {
  const ctx = useUi((s) => s.focusContext);
  const categories = useWorld((s) => s.categories);
  const theme = useTheme();
  const paper = usePaper(paperId);
  const root = useRef<HTMLElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);

  // Basic focus trap; focus returns to whatever opened the panel.
  useEffect(() => {
    opener.current = document.activeElement;
    closeBtn.current?.focus();
    return () => {
      const el = opener.current;
      if (el instanceof HTMLElement && el.isConnected) el.focus();
    };
  }, []);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      useUi.getState().closeFocus();
      return;
    }
    if (e.key !== 'Tab' || !root.current) return;
    const items = root.current.querySelectorAll<HTMLElement>('button, a[href], input, [tabindex]:not([tabindex="-1"])');
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const grounded = (ctx?.grounded ?? []).filter((g) => g.paper_id === paperId);
  const kind = resolveResultCase(paperId, ctx?.citationChecks ?? [], ctx?.grounded ?? []);
  const arxiv = toArxivUrl(paperId);
  const p = paper?.status === 'ready' ? paper.paper : null;
  const color = categoryColor(p?.category_index ?? -1, theme);

  return (
    <aside
      ref={root}
      role="dialog"
      aria-modal="false"
      aria-label={`Chi tiết bài ${paperId}`}
      className="glass glass-strong slide-in-right flex flex-col h-full min-h-0 overflow-hidden"
      data-testid="paper-panel"
      data-paper-id={paperId}
      data-case={kind}
      onKeyDown={onKeyDown}
    >
      <header className="flex items-center gap-2 px-4 py-3 border-b border-[var(--ui-border)]">
        <span className="dot" style={{ background: color, color }} aria-hidden />
        <span className="mono text-xs text-[var(--ink-muted)] truncate">
          {p ? `${categories[p.category_index]?.code ?? 'other'} · ${p.year}` : '…'} · {paperId}
        </span>
        <button ref={closeBtn} type="button" className="btn btn-icon ml-auto" aria-label="Đóng panel" onClick={() => useUi.getState().closeFocus()}>
          <X size={15} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto scroll-thin px-4 py-3 flex flex-col gap-3">
        {kind === 'unverified' && (
          <div role="alert" className="rounded-xl border border-[var(--warn)] bg-[color-mix(in_srgb,var(--warn)_12%,transparent)] px-3 py-2 text-xs flex gap-2">
            <AlertTriangle size={15} className="text-[var(--warn)] flex-none mt-0.5" />
            <span>
              <strong>{UNVERIFIED_WARNING}.</strong> Hãy kiểm tra lại thông tin này trước khi dùng.
            </span>
          </div>
        )}
        {kind === 'grounded' && (
          <div className="used-band rounded-xl px-3 py-2 text-xs flex items-center gap-2">
            <CheckCircle2 size={14} className="text-[var(--success)]" />
            {USED_NOTE} · {grounded.length} đoạn
          </div>
        )}
        {kind === 'browse' && (
          <div className="rounded-xl border border-[var(--ui-border)] px-3 py-2 text-xs flex items-center gap-2 text-[var(--ink-muted)]">
            <Info size={14} /> {BROWSE_NOTE}
          </div>
        )}

        {paper?.status === 'loading' && (
          <div className="flex flex-col gap-2" aria-busy="true" aria-label="Đang tải">
            <div className="skeleton h-5 w-4/5" />
            <div className="skeleton h-3 w-2/5" />
            <div className="skeleton h-20 w-full mt-2" />
            <div className="skeleton h-16 w-full" />
          </div>
        )}
        {paper?.status === 'error' && (
          <p className="text-xs text-[var(--ink-muted)]">
            Không tải được metadata của bài này. <span className="mono">({paper.message})</span>
          </p>
        )}
        {p && (
          <>
            <h2 className="text-base font-semibold leading-snug">{p.title}</h2>
            <p className="text-xs text-[var(--ink-muted)]">{p.authors.join(', ')}</p>
            <div className="flex flex-wrap gap-2">
              {arxiv && (
                <a className="btn !text-xs" href={arxiv} target="_blank" rel="noreferrer noopener">
                  arXiv <ExternalLink size={12} />
                </a>
              )}
              {p.has_fulltext && <span className="tag">full text</span>}
              <span className="tag mono">{p.chunks.length} đoạn</span>
            </div>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)] mb-1">Abstract</h3>
              <Markdown text={p.abstract} className="!text-[0.82rem]" />
            </section>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)] mb-2">Các đoạn</h3>
              <ChunkList chunks={p.chunks} used={grounded} />
            </section>
          </>
        )}
      </div>
    </aside>
  );
}
