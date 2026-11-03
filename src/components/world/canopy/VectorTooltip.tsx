import { useEffect, useState } from 'react';
import { getPaper } from '../../../api/client';
import { useUi } from '../../../store/uiStore';
import { useWorld } from '../../../store/worldStore';
import { categoryColor } from '../../../theme/tokens';
import { useTheme } from '../../../theme/useTheme';
import { Glass } from '../../ui/Glass';

const TITLE_DELAY_MS = 300;

/** Hover card for a vector (title fetched lazily after 300 ms) or a crate tile. */
export function VectorTooltip() {
  const tip = useUi((s) => s.tooltip);
  const theme = useTheme();
  const vectors = useWorld((s) => s.vectors);
  const vectorIds = useWorld((s) => s.vectorIds);
  const categories = useWorld((s) => s.categories);
  const ground = useWorld((s) => s.ground);
  const [title, setTitle] = useState<{ id: string; title: string } | null>(null);
  const paperId = tip?.kind === 'vector' ? vectorIds[tip.id] : undefined;

  useEffect(() => {
    if (!paperId) return;
    let alive = true;
    const t = setTimeout(() => {
      getPaper(paperId)
        .then((p) => alive && setTitle({ id: paperId, title: p.title }))
        .catch(() => alive && setTitle({ id: paperId, title: '(không tải được tiêu đề)' }));
    }, TITLE_DELAY_MS);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [paperId]);

  if (!tip || !vectors) return null;
  const style = { left: Math.min(tip.x + 16, window.innerWidth - 300), top: Math.min(tip.y + 16, window.innerHeight - 120) };

  if (tip.kind === 'crate') {
    const crate = ground?.crates.find((c) => c.id === tip.id);
    if (!crate) return null;
    const cat = categories[crate.category_index];
    const color = categoryColor(crate.category_index, theme);
    return (
      <Glass material="strong" className="fixed z-40 px-3 py-2 text-xs pointer-events-none max-w-72 fade-in" style={style} role="tooltip">
        <div className="flex items-center gap-2 font-semibold">
          <span className="dot" style={{ background: color, color }} /> {cat?.name ?? 'Khác'}
        </div>
        <div className="mono text-[var(--ink-muted)] mt-0.5">
          {cat?.code} · thùng #{crate.id} · {crate.paper_count} bài
        </div>
        <div className="text-[var(--ink-muted)] mt-1">Click để lọc lá theo thùng này</div>
      </Glass>
    );
  }

  const i = tip.id;
  const cat = vectors.categories[i];
  const color = categoryColor(cat, theme);
  return (
    <Glass material="strong" className="fixed z-40 px-3 py-2 text-xs pointer-events-none max-w-80 fade-in" style={style} role="tooltip" data-testid="vector-tooltip">
      <div className="font-semibold leading-snug">
        {title && title.id === paperId ? title.title : <span className="skeleton inline-block h-3 w-48 align-middle" />}
      </div>
      <div className="flex items-center gap-2 mt-1 text-[var(--ink-muted)]">
        <span className="dot" style={{ background: color, color }} />
        <span className="mono">{categories[cat]?.code ?? 'other'}</span>·<span className="mono">{vectors.years[i]}</span>·
        <span className="mono">{paperId}</span>
      </div>
      <div className="mono text-[var(--ink-muted)] mt-0.5">authority {vectors.authority[i].toFixed(3)}{vectors.flags[i] & 1 ? ' · full text' : ''}</div>
    </Glass>
  );
}
