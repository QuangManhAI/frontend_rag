/** WCAG 2.x contrast helpers for theme tokens (#rrggbb or #rrggbbaa). */

type Rgb = readonly [number, number, number];

function parseHex(hex: string): { rgb: Rgb; alpha: number } {
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex);
  if (!m) throw new Error(`Not a #rrggbb[aa] color: ${hex}`);
  const n = parseInt(m[1], 16);
  return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], alpha: m[2] ? parseInt(m[2], 16) / 255 : 1 };
}

const toHex = (rgb: Rgb): string => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;

/** sRGB channel in [0, 1] → linear light. */
export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance of an opaque color (alpha is ignored — composite first). */
export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).rgb.map((c) => srgbToLinear(c / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Blend a translucent foreground over an opaque background (e.g. glass fill over the page). */
export function composite(fg: string, bg: string): string {
  const f = parseHex(fg);
  const b = parseHex(bg).rgb;
  const mix = (i: number) => f.rgb[i] * f.alpha + b[i] * (1 - f.alpha);
  return toHex([mix(0), mix(1), mix(2)]);
}

/** (L1 + 0.05) / (L2 + 0.05) with L1 the lighter color; 1 … 21. */
export function contrastRatio(fg: string, bg: string): number {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
