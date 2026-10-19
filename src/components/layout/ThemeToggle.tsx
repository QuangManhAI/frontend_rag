import { Moon, Sun } from 'lucide-react';
import { useUi } from '../../store/uiStore';

export function ThemeToggle() {
  const theme = useUi((s) => s.theme);
  const next = theme === 'dark' ? 'sáng' : 'tối';
  return (
    <button type="button" className="btn btn-icon" aria-label={`Chuyển sang giao diện ${next}`} title={`Giao diện ${next}`} data-testid="theme-toggle" onClick={() => useUi.getState().toggleTheme()}>
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
