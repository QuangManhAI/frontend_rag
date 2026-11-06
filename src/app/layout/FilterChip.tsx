import { Filter, X } from 'lucide-react';
import { useUi } from '../../shared/store/uiStore';
import { Glass } from '../../shared/ui/Glass';

export function FilterChip() {
  const label = useUi((s) => s.highlightLabel);
  if (!label) return null;
  return (
    <Glass material="strong" shape="chip" className="flex items-center gap-2 px-3 py-1.5 text-xs fade-in" data-testid="filter-chip">
      <Filter size={14} className="text-[var(--accent)]" />
      Đang lọc: <span className="mono">{label.label}</span>
      <button type="button" className="btn btn-icon !p-0.5" aria-label="Bỏ lọc (Esc)" onClick={() => useUi.getState().setHighlights(null, null)}>
        <X size={14} />
      </button>
    </Glass>
  );
}
