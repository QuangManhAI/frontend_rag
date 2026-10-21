import { useFx } from '../../store/fxStore';
import { useRag } from '../../store/ragStore';
import { useUi } from '../../store/uiStore';
import { useWorld } from '../../store/worldStore';
import { vectorPosition } from '../../utils/flight';
import { Anchor } from '../world/overlay/anchors';

/** Small rank badges (#2, #3…) on the other top-k vectors, lifted apart by rank; click to move the focus there. */
export function TopKBadges() {
  const topK = useFx((s) => s.topK);
  const vectors = useWorld((s) => s.vectors);
  const focused = useUi((s) => s.focusedPaperId);
  const visual = useRag((s) => s.visualPhase);
  if (!vectors || (visual !== 'found' && visual !== 'generating' && visual !== 'done')) return null;
  return (
    <>
      {topK
        .filter((t) => t.paper_id !== focused)
        .map((t) => (
          <Anchor key={t.paper_id} position={vectorPosition(vectors, t.index)} declutter={t.rank}>
            <button
              type="button"
              className="topk-badge"
              aria-label={`Kết quả hạng ${t.rank}: ${t.paper_id}`}
              onClick={() => {
                const rag = useRag.getState();
                const ui = useUi.getState();
                ui.focusPaper(t.paper_id, {
                  openPanel: ui.panelPaperId !== null,
                  context: { citationChecks: rag.current.citationChecks, grounded: rag.current.grounded_chunks },
                });
              }}
            >
              <span className="topk-rank">
                <span className="topk-hash">#</span>
                {t.rank}
              </span>
              {t.chunkCount > 1 && <span className="topk-meta">×{t.chunkCount}</span>}
            </button>
          </Anchor>
        ))}
    </>
  );
}
