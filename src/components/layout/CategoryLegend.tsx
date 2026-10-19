import { ChevronDown, Layers } from 'lucide-react';
import { useState } from 'react';
import { useUi } from '../../store/uiStore';
import { useWorld } from '../../store/worldStore';
import { categoryColor } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

export function toggleCategoryFilter(index: number): void {
  const ui = useUi.getState();
  const w = useWorld.getState();
  if (ui.highlightLabel?.kind === 'category' && ui.highlightLabel.id === index) {
    ui.setHighlights(null, null);
    return;
  }
  const indices = w.vectorsByCategory.get(index) ?? new Uint32Array(0);
  const cat = w.categories[index];
  ui.setHighlights(indices, { kind: 'category', id: index, label: `${cat?.code ?? '?'} · ${indices.length.toLocaleString('vi-VN')} bài` });
}

/** Category colors (same as the ground tiles); click filters the canopy to that category. */
export function CategoryLegend() {
  const categories = useWorld((s) => s.categories);
  const theme = useTheme();
  const active = useUi((s) => (s.highlightLabel?.kind === 'category' ? s.highlightLabel.id : -1));
  const [open, setOpen] = useState(() => !(globalThis.matchMedia?.('(max-width: 767px)').matches ?? false));
  if (categories.length === 0) return null;
  return (
    <div className="glass glass-strong w-64 max-w-[calc(100vw-2rem)] text-xs" data-testid="category-legend">
      <button type="button" className="flex w-full items-center gap-2 px-3 py-2 font-semibold" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Layers size={14} className="text-[var(--accent)]" /> Loại bài báo
        <span className="mono ml-auto text-[var(--ink-muted)] font-normal">{categories.length}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <ul className="px-1.5 pb-1.5 max-h-[34vh] overflow-y-auto scroll-thin">
          {categories.map((c) => {
            const color = categoryColor(c.index, theme);
            return (
              <li key={c.index}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-[color-mix(in_srgb,var(--ink)_7%,transparent)] aria-pressed:bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]"
                  aria-pressed={active === c.index}
                  data-category={c.code}
                  onClick={() => toggleCategoryFilter(c.index)}
                >
                  <span className="dot" style={{ background: color, color }} aria-hidden />
                  <span className="mono w-24 truncate">{c.code}</span>
                  <span className="truncate text-[var(--ink-muted)] flex-1">{c.name}</span>
                  <span className="mono text-[var(--ink-muted)]">{c.paper_count.toLocaleString('vi-VN')}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
