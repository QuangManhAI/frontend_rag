/** Every color token is a hex string (#rrggbb or #rrggbbaa). */
export interface ThemeTokens {
  name: 'dark' | 'light';
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

export const lightTheme: ThemeTokens = {
  name: 'light',
  bg: '#fbf9f4',
  bgTop: '#f3effc',
  bgHorizon: '#fdfbf6',
  fog: '#ece6fa',
  fogNear: 240,
  fogFar: 680,
  groundBase: '#e9e7ef',
  groundLine: '#b9b4c8',
  tileSaturation: 1,
  groundOpacity: 0.96,
  groundSeeThrough: 0.3,
  trunk: '#d9c4a3',
  trunkVein: '#f4e7cf',
  veinIntensity: 0.5,
  vectorGlow: 0.6,
  vectorOutline: '#2a2340',
  vectorOutlineStrength: 0.4,
  additiveGlow: false,
  queryOrb: '#0f8f86',
  queryOrbHalo: '#4cc9b8',
  thread: '#0f8f86',
  sap: '#e0a33a',
  firefly: '#d89b2a',
  bloomIntensity: 0.45,
  bloomThreshold: 0.82,
  ambient: 0.75,
  sun: 1.25,
  uiSurface: '#ffffffa6',
  uiSurfaceStrong: '#ffffffeb',
  uiBorder: '#2a234022',
  uiInk: '#1f1a33',
  uiInkMuted: '#6a6483',
  uiAccent: '#0f8f86',
  uiAccentInk: '#ffffff',
  uiWarn: '#b7791f',
  uiDanger: '#c53048',
  uiSuccess: '#1f9d63',
  categoryPalette: [
    '#5aaee0',
    '#e07aac',
    '#7cbf5a',
    '#e3ac4a',
    '#9a88e0',
    '#e88d62',
    '#46c2a4',
    '#de6a78',
    '#6f8ee8',
    '#c48ae0',
    '#bdbd4a',
    '#8fa0c4',
  ],
  categoryOther: '#a8a0b8',
};

export const themes: Record<ThemeTokens['name'], ThemeTokens> = { dark: darkTheme, light: lightTheme };

/** Palette color for a category index; anything outside the 12 slots is "other". */
export function categoryColor(index: number, theme: ThemeTokens): string {
  if (!Number.isInteger(index) || index < 0 || index >= theme.categoryPalette.length) return theme.categoryOther;
  return theme.categoryPalette[index];
}

/** Drop the alpha channel of a #rrggbbaa token (three.js colors are opaque). */
export function opaqueHex(hex: string): string {
  return hex.length === 9 ? hex.slice(0, 7) : hex;
}
