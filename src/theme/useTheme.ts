import { useEffect } from 'react';
import { systemTheme, useUi } from '../store/uiStore';
import { applyCssVars } from './applyCssVars';
import { themes, type ThemeTokens } from './tokens';

/** Current theme tokens (shared by the UI and the 3D scene). */
export function useTheme(): ThemeTokens {
  return themes[useUi((s) => s.theme)];
}

/** Mirrors the theme to CSS variables and follows the OS until the user picks one. */
export function useThemeSync(): void {
  const theme = useTheme();
  const source = useUi((s) => s.themeSource);
  useEffect(() => applyCssVars(theme), [theme]);
  useEffect(() => {
    if (source !== 'system') return;
    let mq: MediaQueryList | undefined;
    try {
      mq = globalThis.matchMedia?.('(prefers-color-scheme: light)');
    } catch {
      return;
    }
    const onChange = () => useUi.getState().setTheme(systemTheme(), 'system');
    mq?.addEventListener('change', onChange);
    return () => mq?.removeEventListener('change', onChange);
  }, [source]);
}
