import { useEffect } from 'react';
import { systemTheme, useUi } from '../store/uiStore';
import { applyCssVars } from './applyCssVars';
import { resolveTheme, themes, type ThemeName, type ThemeTokens } from './tokens';

/** Theme the user's mode resolves to right now (outside React: first paint, tests). */
export function currentThemeName(): ThemeName {
  const s = useUi.getState();
  return resolveTheme(s.settings.themeMode, s.systemTheme);
}

/** Theme tokens shared by the UI and the 3D scene. */
export function useTheme(): ThemeTokens {
  const mode = useUi((s) => s.settings.themeMode);
  const system = useUi((s) => s.systemTheme);
  return themes[resolveTheme(mode, system)];
}

/** Mirrors the theme to CSS variables and follows the OS color scheme while the mode is 'system'. */
export function useThemeSync(): void {
  const theme = useTheme();
  useEffect(() => applyCssVars(theme), [theme]);
  useEffect(() => {
    let mq: MediaQueryList | undefined;
    try {
      mq = globalThis.matchMedia?.('(prefers-color-scheme: light)');
    } catch {
      return;
    }
    if (!mq) return;
    const onChange = () => useUi.getState().setSystemTheme(systemTheme());
    onChange();
    mq.addEventListener?.('change', onChange);
    return () => mq?.removeEventListener?.('change', onChange);
  }, []);
}
