import { describe, expect, it } from 'vitest';
import { bezelProfile, buildRefractionMap, buildSpecularMap, normalRoundRect, sdRoundRect } from './refractionMap';

const px = (map: Uint8ClampedArray, w: number, x: number, y: number) => Array.from(map.slice((y * w + x) * 4, (y * w + x) * 4 + 4));

describe('sdRoundRect / normalRoundRect', () => {
  it('is negative inside, zero on the edge, positive outside', () => {
    expect(sdRoundRect(0, 0, 50, 30, 14)).toBeCloseTo(-30, 9);
    expect(sdRoundRect(50, 0, 50, 30, 14)).toBeCloseTo(0, 9);
    expect(sdRoundRect(60, 0, 50, 30, 14)).toBeCloseTo(10, 9);
  });

  it('normals point out of the nearest edge, diagonally in the corners', () => {
    expect(normalRoundRect(-49, 0, 50, 30, 14)).toEqual([-1, 0]);
    expect(normalRoundRect(0, 29, 50, 30, 14)).toEqual([0, 1]);
    const [nx, ny] = normalRoundRect(-48, -28, 50, 30, 14);
    expect(nx).toBeLessThan(0);
    expect(ny).toBeLessThan(0);
    expect(Math.hypot(nx, ny)).toBeCloseTo(1, 12);
  });
});

describe('buildRefractionMap (P22 examples)', () => {
  const w = 100;
  const h = 60;
  const map = buildRefractionMap(w, h, 14, 14);

  it('has w·h RGBA pixels and a neutral centre', () => {
    expect(map).toHaveLength(w * h * 4);
    expect(px(map, w, 50, 30)).toEqual([128, 128, 128, 255]);
  });

  it('samples from further in along every edge (R > 128 on the left, < 128 on the right)', () => {
    const left = px(map, w, 0, 30);
    const right = px(map, w, w - 1, 30);
    const top = px(map, w, 50, 0);
    const bottom = px(map, w, 50, h - 1);
    expect(left[0]).toBeGreaterThan(128);
    expect(Math.abs(left[1] - 128)).toBeLessThanOrEqual(1);
    expect(right[0]).toBeLessThan(128);
    expect(top[1]).toBeGreaterThan(128);
    expect(bottom[1]).toBeLessThan(128);
  });

  it('is mirror-symmetric', () => {
    for (const x of [0, 3, 10, 25]) {
      const a = px(map, w, x, 30)[0];
      const b = px(map, w, w - 1 - x, 30)[0];
      expect(Math.abs(a + b - 256)).toBeLessThanOrEqual(1);
    }
  });

  it('pushes diagonally in the corners', () => {
    // (2, 2) from the P22 example lies outside the 14 px rounded corner (neutral); (5, 5) is in its band.
    expect(px(map, w, 2, 2).slice(0, 2)).toEqual([128, 128]);
    const [r, g] = px(map, w, 5, 5);
    expect(r).toBeGreaterThan(128);
    expect(g).toBeGreaterThan(128);
    expect(Math.abs(r - g)).toBeLessThanOrEqual(2);
  });

  it('is neutral everywhere when the bezel is 0', () => {
    const flat = buildRefractionMap(20, 10, 4, 0);
    for (let i = 0; i < flat.length; i += 4) expect([flat[i], flat[i + 1]]).toEqual([128, 128]);
  });
});

describe('bezelProfile', () => {
  it('bends most at the rim and fades to 0 where the glass turns flat', () => {
    expect(bezelProfile(0)).toBe(1);
    expect(bezelProfile(1)).toBe(0);
    expect(bezelProfile(2)).toBe(0);
    expect(bezelProfile(0.25)).toBeGreaterThan(bezelProfile(0.5));
  });
});

describe('buildSpecularMap (bevel light, key light from the top left)', () => {
  const w = 100;
  const h = 60;
  const map = buildSpecularMap(w, h, 14, 20, 1);
  const alpha = (x: number, y: number) => map[(y * w + x) * 4 + 3];

  it('is premultiplied white and dark in the flat centre', () => {
    const i = (0 * w + 50) * 4;
    expect(map[i]).toBe(map[i + 3]);
    expect(alpha(50, 30)).toBe(0);
  });

  it('lights the whole rim, brighter inside the bevel on the edges facing the light', () => {
    expect(alpha(50, 4)).toBeGreaterThan(alpha(50, h - 5));
    expect(alpha(4, 30)).toBeGreaterThan(alpha(w - 5, 30));
    expect(alpha(50, h - 1)).toBeGreaterThan(128); // the far rim is lit too (light through the slab)
  });

  it('fades from the rim into the bevel', () => {
    expect(alpha(50, 0)).toBeGreaterThan(alpha(50, 6));
    expect(alpha(50, 6)).toBeGreaterThan(alpha(50, 19));
  });

  it('is empty when switched off', () => {
    expect(buildSpecularMap(20, 10, 4, 0, 1).some((v) => v > 0)).toBe(false);
    expect(buildSpecularMap(20, 10, 4, 6, 0).some((v) => v > 0)).toBe(false);
  });
});

describe('buildRefractionMap dome (whole-slab convex lens)', () => {
  const w = 100;
  const h = 60;
  const map = buildRefractionMap(w, h, 14, 0, 0.5);
  const at = (x: number, y: number) => Array.from(map.slice((y * w + x) * 4, (y * w + x) * 4 + 2));

  it('leaves the centre alone and samples towards it everywhere else', () => {
    const [cr, cg] = at(50, 30);
    expect(Math.abs(cr - 128)).toBeLessThanOrEqual(1);
    expect(Math.abs(cg - 128)).toBeLessThanOrEqual(1);
    expect(at(20, 30)[0]).toBeGreaterThan(128); // left of centre → samples further right
    expect(at(80, 30)[0]).toBeLessThan(128);
    expect(at(50, 10)[1]).toBeGreaterThan(128);
  });

  it('bends more the further from the centre', () => {
    expect(at(10, 30)[0]).toBeGreaterThan(at(35, 30)[0]);
  });
});

describe('buildRefractionMap dome (whole-slab convex lens)', () => {
  const w = 100;
  const h = 60;
  const map = buildRefractionMap(w, h, 14, 0, 0.5);
  const at = (x: number, y: number) => Array.from(map.slice((y * w + x) * 4, (y * w + x) * 4 + 2));

  it('leaves the centre alone and samples towards it everywhere else', () => {
    const [cr, cg] = at(50, 30);
    expect(Math.abs(cr - 128)).toBeLessThanOrEqual(1);
    expect(Math.abs(cg - 128)).toBeLessThanOrEqual(1);
    expect(at(20, 30)[0]).toBeGreaterThan(128);
    expect(at(80, 30)[0]).toBeLessThan(128);
    expect(at(50, 10)[1]).toBeGreaterThan(128);
  });

  it('bends more the further from the centre', () => {
    expect(at(10, 30)[0]).toBeGreaterThan(at(35, 30)[0]);
  });
});
