import type { ThemeTokens } from './tokens';

/** CSS variable name ↔ token key; the UI only reads these variables. */
const CSS_VARS: ReadonlyArray<readonly [string, keyof ThemeTokens]> = [
  ['--bg', 'bg'],
  ['--bg-top', 'bgTop'],
  ['--bg-horizon', 'bgHorizon'],
  ['--ui-surface', 'uiSurface'],
  ['--ui-surface-strong', 'uiSurfaceStrong'],
  ['--ui-border', 'uiBorder'],
  ['--ink', 'uiInk'],
  ['--ink-muted', 'uiInkMuted'],
  ['--accent', 'uiAccent'],
  ['--accent-ink', 'uiAccentInk'],
  ['--warn', 'uiWarn'],
  ['--danger', 'uiDanger'],
  ['--success', 'uiSuccess'],
  ['--orb', 'queryOrb'],
  ['--orb-halo', 'queryOrbHalo'],
  ['--trunk-vein', 'trunkVein'],
  ['--cat-other', 'categoryOther'],
  ['--ink-faint', 'uiInkFaint'],
  ['--glass-tint', 'glassTint'],
  ['--glass-fill', 'glassFill'],
  ['--glass-fill-hover', 'glassFillHover'],
  ['--glass-highlight', 'glassHighlight'],
  ['--glass-highlight-strong', 'glassHighlightStrong'],
  ['--glass-lowlight', 'glassLowlight'],
  ['--glass-stroke-strong', 'glassStrokeStrong'],
];

/** Write theme tokens to :root as CSS variables and stamp data-theme. */
export function applyCssVars(theme: ThemeTokens, root: HTMLElement = document.documentElement): void {
  for (const [name, key] of CSS_VARS) {
    root.style.setProperty(name, String(theme[key]));
  }
  theme.categoryPalette.forEach((c, i) => root.style.setProperty(`--cat-${i}`, c));
  root.dataset.theme = theme.name;
  root.style.colorScheme = theme.name;
}
