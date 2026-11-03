/**
 * Displacement and highlight maps for Liquid Glass level 3 (docs/FE_DESIGN_SYSTEM.md §10.5): a convex lens
 * band along the edge of a rounded rectangle, lit by a fixed key light. Pure — no DOM; LiquidFilters turns it into an <feImage>.
 * R/G encode the x/y displacement (128 = none); feDisplacementMap samples at p + scale·(C/255 − ½).
 */

/** Signed distance to a rounded rectangle centred at the origin (< 0 inside). */
export function sdRoundRect(px: number, py: number, hw: number, hh: number, r: number): number {
  const qx = Math.abs(px) - (hw - r);
  const qy = Math.abs(py) - (hh - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

/** Outward unit normal of the nearest edge (analytic gradient of sdRoundRect). */
export function normalRoundRect(px: number, py: number, hw: number, hh: number, r: number): [number, number] {
  const qx = Math.abs(px) - (hw - r);
  const qy = Math.abs(py) - (hh - r);
  let nx: number;
  let ny: number;
  if (qx > 0 && qy > 0) {
    const h = Math.hypot(qx, qy);
    nx = qx / h; // corner: towards the arc's centre-out direction
    ny = qy / h;
  } else if (qx > qy) {
    nx = 1;
    ny = 0;
  } else {
    nx = 0;
    ny = 1;
  }
  return [Math.sign(px) * nx || nx, Math.sign(py) * ny || ny];
}

/**
 * How strongly the bevel bends light at normalised depth x ∈ [0, 1] from the edge: (1 − x)², i.e. the
 * slope of a convex bevel — strongest at the rim, fading smoothly to 0 where the glass turns flat.
 */
export function bezelProfile(x: number): number {
  const c = 1 - Math.min(Math.max(x, 0), 1);
  return c * c;
}

/**
 * RGBA bytes (w·h·4), two lens terms added together (offsets in units of the filter's max offset):
 * - bevel: inside the bezel the backdrop is sampled from further in, by bezelProfile (strongest at the edge,
 *   smooth to 0 where the glass turns flat) — objects bend and stretch around the rim;
 * - dome (`dome` 0 … 1): the whole slab is slightly convex, so every point samples towards the centre in
 *   proportion to its distance from it (a magnifying lens; 0 at the centre, `dome` at the edge) — what is
 *   behind curves along the glass instead of only shifting at the rim.
 * The sum is clamped to the encodable range.
 */
export function buildRefractionMap(w: number, h: number, r: number, bezel: number, dome = 0): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  const hw = w / 2;
  const hh = h / 2;
  const rad = Math.min(r, hw, hh);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - hw;
      const py = y + 0.5 - hh;
      const d = -sdRoundRect(px, py, hw, hh, rad); // depth inside the edge, ≥ 0
      let dx = 0;
      let dy = 0;
      if (d >= 0 && dome > 0) {
        // Squared radius from the centre (0 … 1 per axis) keeps the middle undistorted and bends the outside.
        const ux = px / hw;
        const uy = py / hh;
        const bend = dome * Math.min(1, ux * ux + uy * uy);
        const len = Math.hypot(ux, uy) || 1;
        dx -= (ux / len) * bend;
        dy -= (uy / len) * bend;
      }
      if (bezel > 0 && d >= 0 && d < bezel) {
        const k = bezelProfile(d / bezel);
        const [nx, ny] = normalRoundRect(px, py, hw, hh, rad);
        dx -= nx * k;
        dy -= ny * k;
      }
      dx = Math.max(-1, Math.min(1, dx));
      dy = Math.max(-1, Math.min(1, dy));
      const i = (y * w + x) * 4;
      data[i] = Math.round(128 + 127 * dx);
      data[i + 1] = Math.round(128 + 127 * dy);
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
  }
  return data;
}

/** Fixed key light of the baked highlight: from the top left, as a unit vector in screen space (y down). */
export const KEY_LIGHT: readonly [number, number] = [-0.6, -0.8];

/**
 * Baked light of the glass body (white, premultiplied alpha): where the bezel faces the key light it
 * catches a sharp rim line and a softer glow that fades over the bevel; the opposite edge gets the light
 * that passed through the glass (weaker). Composited over the refracted backdrop inside the SVG filter,
 * so it brightens what is behind instead of greying it. `strength` scales every alpha (0 … 1).
 */
export function buildSpecularMap(
  w: number,
  h: number,
  r: number,
  bezel: number,
  strength: number,
  light: readonly [number, number] = KEY_LIGHT,
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  if (bezel <= 0 || strength <= 0) return data;
  const hw = w / 2;
  const hh = h / 2;
  const rad = Math.min(r, hw, hh);
  const [lx, ly] = light;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - hw;
      const py = y + 0.5 - hh;
      const d = -sdRoundRect(px, py, hw, hh, rad);
      if (d < 0 || d >= bezel) continue;
      const [nx, ny] = normalRoundRect(px, py, hw, hh, rad);
      const facing = nx * lx + ny * ly; // 1 where the edge faces the light, −1 on the far side
      // Key light on the facing edges, and the light that crossed the slab on the far edges (still clearly lit:
      // Apple's glass reads as raised because the whole rim glows, not only its lit side).
      const lobe = facing > 0 ? Math.pow(facing, 1.2) : 0.7 * Math.pow(-facing, 1.2);
      const rim = Math.exp(-d / 1.8); // ~2 px bright line on the very edge, all the way round
      const glow = bezelProfile(d / bezel) * 0.75; // light travelling inside the bevel
      const a = Math.min(1, strength * (rim * (0.55 + 0.45 * lobe) + glow * (0.25 + 0.75 * lobe)));
      const i = (y * w + x) * 4;
      const v = Math.round(255 * a); // premultiplied white
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = v;
    }
  }
  return data;
}
