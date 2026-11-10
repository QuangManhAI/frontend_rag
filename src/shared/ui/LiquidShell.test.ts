import { describe, expect, it } from 'vitest';
import { liquidOptics, type LiquidPanel } from './LiquidShell';
import { DARK_OPTICS } from './LiquidShell.dark';
import { LIGHT_OPTICS } from './LiquidShell.light';

const PANELS: LiquidPanel[] = ['chat', 'topbar', 'legend', 'settings'];

describe('liquid glass optics: one file per theme', () => {
  it('each theme has optics for every panel and liquidOptics picks the right file', () => {
    for (const p of PANELS) {
      expect(liquidOptics(p, 'dark')).toBe(DARK_OPTICS[p]);
      expect(liquidOptics(p, 'light')).toBe(LIGHT_OPTICS[p]);
    }
  });

  it('dark keeps the hand-tuned night values', () => {
    expect(DARK_OPTICS.chat).toMatchObject({ frost: 7, glow: 0.3, specular: 0.6, depth: 0.02 });
    expect(DARK_OPTICS.topbar.depth).toBe(0.1);
  });

  it('light glass is clearer than dark: less frost, no inner glow', () => {
    for (const p of PANELS) {
      expect(LIGHT_OPTICS[p].frost ?? 0).toBeLessThan(DARK_OPTICS[p].frost ?? 0);
      expect(LIGHT_OPTICS[p].glow).toBe(0);
    }
  });
});
