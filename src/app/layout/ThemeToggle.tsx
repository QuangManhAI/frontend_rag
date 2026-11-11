import { Moon, Sun } from 'lucide-react';
import { useUi } from '../../shared/store/uiStore';
import { resolveTheme } from '../../shared/theme/tokens';

/**
 * Custom glass button for quick light/dark theme toggling on TopBar.
 * Toggles between light and dark mode directly and syncs with uiStore & localStorage.
 */
export function ThemeToggle() {
  const themeMode = useUi((s) => s.settings.themeMode);
  const systemTheme = useUi((s) => s.systemTheme);
  const reduceMotion = useUi((s) => s.settings.reduceMotion);

  const resolved = resolveTheme(themeMode, systemTheme);
  const isLight = resolved === 'light';

  const handleToggle = () => {
    const nextMode = isLight ? 'dark' : 'light';
    useUi.getState().updateSettings({ themeMode: nextMode });
  };

  const label = isLight ? 'Chuyển sang giao diện Tối' : 'Chuyển sang giao diện Sáng';

  return (
    <button
      type="button"
      className="btn btn-icon relative overflow-hidden group"
      aria-label={label}
      title={label}
      data-testid="theme-toggle"
      data-theme={resolved}
      onClick={handleToggle}
    >
      <span className="relative w-4 h-4 flex items-center justify-center">
        <Sun
          size={16}
          className={`absolute text-[var(--warn)] transition-all ${
            reduceMotion ? 'duration-0' : 'duration-300 ease-out'
          } ${
            isLight
              ? 'rotate-0 scale-100 opacity-100'
              : 'rotate-90 scale-0 opacity-0 pointer-events-none'
          }`}
          aria-hidden="true"
        />
        <Moon
          size={16}
          className={`absolute text-[var(--accent)] transition-all ${
            reduceMotion ? 'duration-0' : 'duration-300 ease-out'
          } ${
            !isLight
              ? 'rotate-0 scale-100 opacity-100'
              : '-rotate-90 scale-0 opacity-0 pointer-events-none'
          }`}
          aria-hidden="true"
        />
      </span>
    </button>
  );
}
