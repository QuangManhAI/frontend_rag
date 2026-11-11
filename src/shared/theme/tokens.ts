export type ThemeName = 'dark' | 'light';
/** What the user picked: follow the OS, or force one theme. */
export type ThemeMode = 'system' | ThemeName;
export const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

/** Every color token is a hex string (#rrggbb or #rrggbbaa). */
export interface ThemeTokens {
  /** Dark = neon night tree; light = daytime tree (blue sky, wooden bark, flowers). */
  name: ThemeName;
  /** Sky: gradient top, horizon and the flat page color behind the canvas. */
  bg: string;
  bgTop: string;
  bgHorizon: string;
  /** Daylight sky only: whitish haze hugging the horizon (aerial perspective) and the sun's glow. */
  daySky: boolean;
  skyHaze: string;
  /** Sunlight color (day: the visible sun, its key light and the rim/back-light glow on the tree). */
  sunColor: string;
  /** Moonlight color (night: the visible moon and its celestial moonlight key on the tree). */
  moonColor: string;
  /** Strength of the view-dependent sunlight on bark and petals (0 = none, night). */
  sunGlow: number;
  /** Glints on the rising particle streams and glitter in the knowledge blocks (0 = off). */
  sparkle: number;
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
  /** Darkened wood-grain lines on the bark (0 = smooth neon bark). */
  barkGrain: number;
  /** Share of the category color blended into branches toward their tips (1 = full neon tint). */
  branchTint: number;
  /** Canopy points drawn as five-petal flowers (light) instead of glowing dots (dark). */
  vectorFlowers: boolean;
  /** Canopy point size multiplier (flowers need a little more room than glow dots). */
  vectorSize: number;
  /** Starfield behind the sky dome. */
  stars: boolean;
  /** Strength of the vector halo; optional dark outline drawn around points. */
  vectorGlow: number;
  vectorOutline: string;
  vectorOutlineStrength: number;
  /** Additive blending for glows (the shipped theme is dark). */
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
  /** Glass material (docs/design/FE_DESIGN_SYSTEM.md §4): dark tint behind regular panels. */
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
  /** 12 neon category colors + fallback. */
  categoryPalette: readonly string[];
  categoryOther: string;
}

export const darkTheme: ThemeTokens = {
  name: 'dark',
  bg: '#070614',
  bgTop: '#03030c',
  bgHorizon: '#24123f',
  daySky: false,
  skyHaze: '#24123f',
  sunColor: '#ffffff',
  moonColor: '#dce8ff',
  sunGlow: 0,
  sparkle: 0,
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
  barkGrain: 0,
  branchTint: 1,
  vectorFlowers: false,
  vectorSize: 1,
  stars: true,
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
  uiBorder: '#ffffff24', // 0.14 — also the glass edge (FE_DESIGN_SYSTEM §2.2)
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

/**
 * Daytime tree: blue sky, brown wooden bark, and every paper vector blooms as a flower in its
 * category color. UI glass turns into white frosted panels with dark ink.
 */
export const lightTheme: ThemeTokens = {
  name: 'light',
  bg: '#d6eafb',
  bgTop: '#2a72d6',
  bgHorizon: '#8cc5f2',
  daySky: true,
  skyHaze: '#e6f3fc',
  sunColor: '#fff1d6',
  moonColor: '#dce8ff',
  sunGlow: 1,
  sparkle: 1,
  fog: '#a9cff2',
  fogNear: 260,
  fogFar: 720,
  // Glass platform: a pale aqua pane the sky shows through, with white seams.
  groundBase: '#e8f6fd',
  groundLine: '#ffffff',
  tileSaturation: 0.95,
  groundOpacity: 0.55,
  groundSeeThrough: 0.25,
  trunk: '#6b4a2e',
  // Same flowing sap veins as the night tree, a deeper aqua so they read on brown bark in daylight.
  trunkVein: '#3fe0f0',
  veinIntensity: 1.15,
  barkGrain: 1,
  branchTint: 0.22,
  vectorFlowers: true,
  vectorSize: 1.45,
  stars: false,
  vectorGlow: 0,
  vectorOutline: '#ffffff',
  vectorOutlineStrength: 0,
  additiveGlow: false,
  queryOrb: '#0f8f86',
  queryOrbHalo: '#3fbfae',
  thread: '#0f7f77',
  sap: '#e0a33a',
  firefly: '#fff2a8',
  // Only HDR highlights bloom (petal gloss, sparkles, the orb): the haze near the horizon stays crisp.
  bloomIntensity: 0.6,
  bloomThreshold: 1,
  ambient: 0.75,
  sun: 1.35,
  uiSurface: '#ffffffa6',
  uiSurfaceStrong: '#ffffffeb',
  uiBorder: '#2a234022',
  uiInk: '#1a1730',
  uiInkMuted: '#4f4a68',
  uiAccent: '#0b7a72',
  uiAccentInk: '#ffffff',
  uiWarn: '#8a5300',
  uiDanger: '#b3243b',
  uiSuccess: '#16794b',
  uiInkFaint: '#7d7896',
  glassTint: '#ffffff3d',
  glassFill: '#1a17300a',
  glassFillHover: '#1a173014',
  glassHighlight: '#ffffffb3',
  glassHighlightStrong: '#ffffffe6',
  glassLowlight: '#1a17300f',
  glassStrokeStrong: '#2a234040',
  // Same hues as the neon palette, a touch deeper so petals stay readable against the blue sky.
  categoryPalette: [
    '#1fa3d6', // cs.LG
    '#e8307f', // cs.CL
    '#5fbf2a', // cs.CV
    '#f2a516', // cs.AI
    '#8a6af0', // stat.ML
    '#f26a30', // cs.IR
    '#16b892', // cs.RO
    '#e03445', // math.OC
    '#3f68e8', // q-bio.QM
    '#d466e8', // physics.comp-ph
    '#c6d42a',
    '#f4f0ff',
  ],
  categoryOther: '#a89cc0',
};

export const themes: Record<ThemeName, ThemeTokens> = { dark: darkTheme, light: lightTheme };

/** Resolve the user's mode against the OS preference. */
export function resolveTheme(mode: ThemeMode, system: ThemeName): ThemeName {
  return mode === 'system' ? system : mode;
}


/** Palette color for a category index; anything outside the 12 slots is "other". */
export function categoryColor(index: number, theme: ThemeTokens): string {
  if (!Number.isInteger(index) || index < 0 || index >= theme.categoryPalette.length) return theme.categoryOther;
  return theme.categoryPalette[index];
}

/** Drop the alpha channel of a #rrggbbaa token (three.js colors are opaque). */
export function opaqueHex(hex: string): string {
  return hex.length === 9 ? hex.slice(0, 7) : hex;
}
