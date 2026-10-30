import type { Rotor } from '../utils/rotation';

/** Liquid Glass levels (docs/FE_DESIGN_SYSTEM.md §10.5): 0 opaque · 1 frosted · 2 + specular · 3 + refraction · 4 WebGL. */
export type LgLevel = 0 | 1 | 2 | 3 | 4;
/** User choice in Settings: off = 0, frosted = 1, liquid = highest supported. */
export type GlassSetting = 'auto' | 'off' | 'frosted' | 'liquid';
export const GLASS_SETTINGS: readonly GlassSetting[] = ['auto', 'off', 'frosted', 'liquid'];

export interface LgEnv {
  reducedTransparency: boolean;
  contrastMore: boolean;
  /** Refraction (level 3) relies on backdrop-filter: url(), which only Chromium renders. */
  chromium: boolean;
  qualityMode: 'auto' | 'high' | 'low';
  /** AdaptiveQuality tier: 0 full … 3 no post-processing. */
  tier: number;
}

/** Highest level the environment and the user's setting allow. Level 4 needs P23. */
export function detectLevel(env: LgEnv, setting: GlassSetting): LgLevel {
  if (setting === 'off' || env.reducedTransparency) return 0;
  if (setting === 'frosted') return 1;
  let max: LgLevel = env.chromium ? 3 : 2;
  if (env.qualityMode === 'low' || env.tier >= 2) max = 2;
  if (env.contrastMore) max = 2;
  return max;
}

/** Light rests above the screen, shining down: the top edge of every panel catches it. */
export const LIGHT_REST: Rotor = { re: 0, im: -1 };

/** Direction from the screen centre to the pointer as a unit rotor (no atan2). */
export function lightFromPointer(px: number, py: number, vw: number, vh: number): Rotor {
  const dx = px - vw / 2;
  const dy = py - vh / 2;
  const h = Math.hypot(dx, dy);
  return h < 1 ? LIGHT_REST : { re: dx / h, im: dy / h };
}

/** Normalised lerp between two unit rotors — smooth light motion without angles. */
export function nlerp(a: Rotor, b: Rotor, t: number): Rotor {
  const re = a.re + (b.re - a.re) * t;
  const im = a.im + (b.im - a.im) * t;
  const h = Math.hypot(re, im);
  return h < 1e-6 ? b : { re: re / h, im: im / h };
}

function media(query: string): boolean {
  try {
    return globalThis.matchMedia?.(query).matches ?? false;
  } catch {
    return false;
  }
}

function isChromium(): boolean {
  const nav = globalThis.navigator as (Navigator & { userAgentData?: { brands?: { brand: string }[] } }) | undefined;
  const brands = nav?.userAgentData?.brands;
  if (brands) return brands.some((b) => b.brand === 'Chromium'); // Chrome, Edge, Opera, Brave
  return /Chrome\/|Chromium\//.test(nav?.userAgent ?? '');
}

/** Media queries and engine, plus the current quality state. */
export function readEnv(qualityMode: LgEnv['qualityMode'], tier: number): LgEnv {
  return {
    reducedTransparency: media('(prefers-reduced-transparency: reduce)'),
    contrastMore: media('(prefers-contrast: more)'),
    chromium: isChromium(),
    qualityMode,
    tier,
  };
}
