/** Every color token is a hex string (#rrggbb or #rrggbbaa). */
export interface ThemeTokens {
  /** Only the dark (neon) theme ships; light mode was removed. */
  name: 'dark';
  /** Sky: gradient top, horizon and the flat page color behind the canvas. */
  bg: string;
  bgTop: string;
  bgHorizon: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  /** Ground tiles without a crate, and the grid seams between tiles. */
  groundBase: string;
  groundLine: string;
  /** Brightness multiplier applied to category colors on ground tiles. */
  tileSaturation: number;
  /** Ground opacity in normal modes and in `ground` (see-through) mode. */
  groundOpacity: number;
  groundSeeThrough: number;
  trunk: string;
  trunkVein: string;
  veinIntensity: number;
  /** Strength of the vector halo; outline drawn around points (light theme). */
  vectorGlow: number;
  vectorOutline: string;
  vectorOutlineStrength: number;
  /** Additive blending looks right on dark backgrounds only. */
  additiveGlow: boolean;
  queryOrb: string;
  queryOrbHalo: string;
  thread: string;
  sap: string;
  firefly: string;
  bloomIntensity: number;
  bloomThreshold: number;
  ambient: number;
  sun: number;
  /** Glass UI surfaces. */
  uiSurface: string;
  uiSurfaceStrong: string;
  uiBorder: string;
  uiInk: string;
  uiInkMuted: string;
  uiAccent: string;
  uiAccentInk: string;
  uiWarn: string;
  uiDanger: string;
  uiSuccess: string;
  /** Faint ink: placeholders, timestamps, disabled — never body text (~3:1 on bg). */
  uiInkFaint: string;
  /** Glass material (docs/FE_DESIGN_SYSTEM.md §4): dark tint behind regular panels. */
  glassTint: string;
  /** White fill of controls inside glass, at rest and on hover/focus. */
  glassFill: string;
  glassFillHover: string;
  /** Top edge highlight (static specular), normal and strong (CTA, focus). */
  glassHighlight: string;
  glassHighlightStrong: string;
  /** Bottom edge highlight. */
  glassLowlight: string;
  /** Border on hover and under prefers-contrast: more. */
  glassStrokeStrong: string;
  /** 12 category colors (neon in dark, pastel in light) + fallback. */
  categoryPalette: readonly string[];
  categoryOther: string;
}

export const darkTheme: ThemeTokens = {
  name: 'dark',
  bg: '#070614',
  bgTop: '#03030c',
  bgHorizon: '#24123f',
  fog: '#1a1033',
  fogNear: 220,
  fogFar: 620,
  groundBase: '#0b0a18',
  groundLine: '#6b5cff',
  tileSaturation: 0.62,
  groundOpacity: 0.94,
  groundSeeThrough: 0.22,
  trunk: '#2a1c1a',
  trunkVein: '#7cf7ff',
  veinIntensity: 2.2,
  vectorGlow: 1,
  vectorOutline: '#000000',
  vectorOutlineStrength: 0,
  additiveGlow: true,
  queryOrb: '#e6fbff',
  queryOrbHalo: '#7fe8ff',
  thread: '#9ff3ff',
  sap: '#b8fff6',
  firefly: '#ffe9a3',
  bloomIntensity: 1.35,
  bloomThreshold: 0.42,
  ambient: 0.35,
  sun: 0.9,
  uiSurface: '#120f2499',
  uiSurfaceStrong: '#151129e6',
  uiBorder: '#ffffff1f',
  uiInk: '#ece9ff',
  uiInkMuted: '#a29cc4',
  uiAccent: '#7fe8ff',
  uiAccentInk: '#06121a',
  uiWarn: '#ffc145',
  uiDanger: '#ff5d73',
  uiSuccess: '#58f0a7',
  uiInkFaint: '#64607e', // uiInkMuted at 60% over bg
  glassTint: '#0c0a183d', // = rgba(12, 10, 24, 0.24), the .glass fill today
  glassFill: '#ffffff0a', // 0.04
  glassFillHover: '#ffffff14', // 0.08
  glassHighlight: '#ffffff29', // 0.16
  glassHighlightStrong: '#ffffff3d', // 0.24
  glassLowlight: '#ffffff0a', // 0.04
  glassStrokeStrong: '#ffffff38', // 0.22
  categoryPalette: [
    '#38d6ff', // cs.LG
    '#ff3d9a', // cs.CL
    '#8dff4a', // cs.CV
    '#ffc23d', // cs.AI
    '#a98bff', // stat.ML
    '#ff7a45', // cs.IR
    '#2ff5c8', // cs.RO
    '#ff4d5e', // math.OC
    '#4d7cff', // q-bio.QM
    '#f08cff', // physics.comp-ph
    '#e8ff5a',
    '#d9e6ff',
  ],
  categoryOther: '#8a7fa8',
};


/** Palette color for a category index; anything outside the 12 slots is "other". */
export function categoryColor(index: number, theme: ThemeTokens): string {
  if (!Number.isInteger(index) || index < 0 || index >= theme.categoryPalette.length) return theme.categoryOther;
  return theme.categoryPalette[index];
}

/** Drop the alpha channel of a #rrggbbaa token (three.js colors are opaque). */
export function opaqueHex(hex: string): string {
  return hex.length === 9 ? hex.slice(0, 7) : hex;
}
