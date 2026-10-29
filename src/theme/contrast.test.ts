import { describe, expect, it } from 'vitest';
import { composite, contrastRatio, luminance, srgbToLinear } from './contrast';
import { darkTheme } from './tokens';

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

describe('contrast', () => {
  it('matches the WCAG reference points', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 2);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
    expect(luminance('#ffffff')).toBeCloseTo(1, 6);
    expect(srgbToLinear(0.04045)).toBeCloseTo(0.04045 / 12.92, 9);
  });

  it('is symmetric', () => {
    expect(contrastRatio(darkTheme.uiInk, darkTheme.bg)).toBeCloseTo(contrastRatio(darkTheme.bg, darkTheme.uiInk), 9);
  });

  it('composites a translucent fill over the page', () => {
    const got = channels(composite('#ffffff0a', '#070614'));
    [17, 16, 29].forEach((c, i) => expect(Math.abs(got[i] - c)).toBeLessThanOrEqual(1));
    expect(composite('#0c0a18', '#ffffff')).toBe('#0c0a18'); // opaque fg wins
  });

  it('rejects malformed colors', () => {
    expect(() => contrastRatio('red', '#000000')).toThrow(/#rrggbb/);
  });

  it('ink tokens keep their legibility tiers on the page background', () => {
    expect(contrastRatio(darkTheme.uiInk, darkTheme.bg)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(darkTheme.uiInkMuted, darkTheme.bg)).toBeGreaterThanOrEqual(4.5);
    const faint = contrastRatio(darkTheme.uiInkFaint, darkTheme.bg);
    expect(faint).toBeGreaterThanOrEqual(3); // placeholders / disabled only
    expect(faint).toBeLessThan(4.5);
  });

  it('accent ink is readable on the accent fill', () => {
    expect(contrastRatio(darkTheme.uiAccentInk, darkTheme.uiAccent)).toBeGreaterThanOrEqual(4.5);
  });
});
