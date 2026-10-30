import { describe, expect, it } from 'vitest';
import { detectLevel, LIGHT_REST, lightFromPointer, nlerp, type LgEnv } from './liquidGlass';

const env = (over: Partial<LgEnv> = {}): LgEnv => ({ reducedTransparency: false, contrastMore: false, chromium: true, qualityMode: 'auto', tier: 0, ...over });

describe('detectLevel (FE_DESIGN_SYSTEM §10.5)', () => {
  it('auto picks the highest supported level', () => {
    expect(detectLevel(env(), 'auto')).toBe(3);
    expect(detectLevel(env({ chromium: false }), 'auto')).toBe(2);
  });

  it('cheap quality, high tiers and high contrast cap at level 2', () => {
    expect(detectLevel(env({ tier: 2 }), 'liquid')).toBe(2);
    expect(detectLevel(env({ qualityMode: 'low' }), 'auto')).toBe(2);
    expect(detectLevel(env({ contrastMore: true }), 'auto')).toBe(2);
  });

  it('user choices and reduced transparency win', () => {
    expect(detectLevel(env(), 'off')).toBe(0);
    expect(detectLevel(env(), 'frosted')).toBe(1);
    expect(detectLevel(env({ reducedTransparency: true }), 'liquid')).toBe(0);
  });
});

describe('light direction as a rotor', () => {
  it('points from the screen centre to the pointer', () => {
    expect(lightFromPointer(1440, 450, 1440, 900)).toEqual({ re: 1, im: 0 });
    expect(lightFromPointer(720, 0, 1440, 900)).toEqual({ re: 0, im: -1 });
    const d = lightFromPointer(0, 900, 1440, 900);
    expect(Math.hypot(d.re, d.im)).toBeCloseTo(1, 12);
  });

  it('rests above the screen when the pointer is at the centre', () => {
    expect(lightFromPointer(720, 450, 1440, 900)).toEqual(LIGHT_REST);
  });

  it('nlerp stays on the unit circle and reaches the target', () => {
    let cur = LIGHT_REST;
    const target = { re: 1, im: 0 };
    for (let i = 0; i < 60; i++) {
      cur = nlerp(cur, target, 0.25);
      expect(Math.hypot(cur.re, cur.im)).toBeCloseTo(1, 12);
    }
    expect(Math.abs(cur.re - 1) + Math.abs(cur.im)).toBeLessThan(1e-3);
  });

  it('opposite rotors do not collapse to zero', () => {
    const r = nlerp({ re: 1, im: 0 }, { re: -1, im: 0 }, 0.5);
    expect(Math.hypot(r.re, r.im)).toBeCloseTo(1, 12);
  });
});
