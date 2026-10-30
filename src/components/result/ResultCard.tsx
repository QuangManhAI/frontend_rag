import { ArrowUpRight, X } from 'lucide-react';
import { useUi } from '../../store/uiStore';
import { useWorld } from '../../store/worldStore';
import { categoryColor } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { vectorPosition } from '../../utils/flight';
import { groupGroundedByPaper, resolveResultCase } from '../../utils/resultCase';
import { Anchor } from '../world/overlay/anchors';
import { ScoreBars } from './ScoreBars';
import { usePaper } from './usePaper';

/** Glass card pinned beside the focused vector (DOM overlay, so it always faces the camera). */
export function ResultCard() {
  const paperId = useUi((s) => s.focusedPaperId);
  const ctx = useUi((s) => s.focusContext);
  const index = useWorld((s) => (paperId ? s.vectorIndexByPaperId.get(paperId) : undefined));
  const vectors = useWorld((s) => s.vectors);
  const categories = useWorld((s) => s.categories);
  const theme = useTheme();
  const paper = usePaper(paperId);
  if (!paperId || index === undefined || !vectors) return null;

  const kind = resolveResultCase(paperId, ctx?.citationChecks ?? [], ctx?.grounded ?? []);
  const grouped = kind === 'grounded' ? groupGroundedByPaper(ctx?.grounded ?? []).find((g) => g.paper_id === paperId) : undefined;
  const cat = vectors.categories[index];
  const color = categoryColor(cat, theme);
  const title = grouped?.title ?? (paper?.status === 'ready' ? paper.paper.title : null);
  const pos = vectorPosition(vectors, index);

  return (
    <Anchor position={pos} distanceFactor={16} keepInView>
      <article className="result-card glass glass-strong p-3 text-xs" data-testid="result-card" data-paper-id={paperId} aria-label="Thẻ kết quả">
        <header className="flex items-start gap-2">
          <span className="dot mt-1" style={{ background: color, color }} aria-hidden />
          <h3 className="font-semibold text-xs leading-snug flex-1 line-clamp-2">{title ?? <span className="skeleton inline-block h-3 w-44" />}</h3>
          <button type="button" className="btn btn-icon !p-1 -mt-1 -mr-1" aria-label="Đóng thẻ" onClick={() => useUi.getState().closeFocus()}>
            <X size={14} />
          </button>
        </header>
        <div className="mono text-[var(--ink-muted)] mt-1">
          {categories[cat]?.code ?? 'other'} · {vectors.years[index]} · {paperId}
        </div>
        {grouped ? (
          <>
            <div className="mt-2">
              <ScoreBars chunk={grouped.best} compact />
            </div>
            <p className="clamp-3 mt-2 text-[var(--ink-muted)] leading-relaxed">
              <span className="text-[var(--ink)]">{grouped.best.section_title}: </span>
              {grouped.best.text.replace(/\$\$?[^$]*\$\$?/g, '…')}
            </p>
            {grouped.chunks.length > 1 && <div className="tag mt-1.5">khớp {grouped.chunks.length} đoạn</div>}
          </>
        ) : (
          <p className="mt-2 text-[var(--ink-muted)]">Không được dùng cho câu trả lời này.</p>
        )}
        <button type="button" className="btn btn-primary w-full justify-center mt-2.5 !py-1" onClick={() => useUi.getState().openPanel(paperId)}>
          Xem chi tiết <ArrowUpRight size={14} />
        </button>
      </article>
    </Anchor>
  );
}
