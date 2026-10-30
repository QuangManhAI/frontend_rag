import { Settings2 } from 'lucide-react';
import { useUi } from '../../store/uiStore';
import { HealthDots } from './HealthBanner';
import type { HealthStatus } from '../../types/world';

export function TopBar({ health }: { health: HealthStatus | 'unreachable' | null }) {
  const settingsOpen = useUi((s) => s.settingsOpen);
  return (
    <header className="glass flex items-center gap-2 md:gap-3 px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden className="flex-none">
          <circle cx="12" cy="7" r="5" fill="var(--accent)" opacity="0.25" />
          <path d="M12 21V11M12 14l-4-4M12 12l4-4" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" fill="none" />
          <circle cx="8" cy="10" r="1.6" fill="var(--cat-1, var(--accent))" />
          <circle cx="16" cy="8" r="1.6" fill="var(--cat-2, var(--accent))" />
          <circle cx="12" cy="5" r="1.6" fill="var(--cat-0, var(--accent))" />
        </svg>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold leading-tight truncate">Cây Tri Thức Vector</h1>
          <p className="text-micro text-[var(--ink-muted)] leading-tight truncate hidden sm:block">RAG trực quan · tài liệu khoa học</p>
        </div>
      </div>
      <span className="ml-auto" />
      <HealthDots health={health} />
      <button type="button" className="btn btn-icon" aria-label="Cài đặt" aria-pressed={settingsOpen} data-testid="settings-toggle" onClick={() => useUi.getState().setSettingsOpen(!settingsOpen)}>
        <Settings2 size={16} />
      </button>
    </header>
  );
}
