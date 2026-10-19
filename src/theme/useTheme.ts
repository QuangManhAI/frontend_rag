import { useEffect } from 'react';
import { applyCssVars } from './applyCssVars';
import { darkTheme, type ThemeTokens } from './tokens';

/** Theme tokens shared by the UI and the 3D scene (dark only). */
export function useTheme(): ThemeTokens {
  return darkTheme;
}

/** Mirrors the theme to CSS variables. */
export function useThemeSync(): void {
  useEffect(() => applyCssVars(darkTheme), []);
}
