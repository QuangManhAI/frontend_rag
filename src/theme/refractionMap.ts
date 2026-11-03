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
 * How far the bevel shifts the backdrop at normalised depth x ∈ [0, 1]: 1 − 3x² + 2x³ (smoothstep, falling).
 * Flat at both ends, so the bevel has no visible start or end line, and its steepest slope is 1.5 (at x = ½):
 * kept under 1 by the caller (offset < bezel / 1.5), the backdrop is squeezed but never folds back on itself,
 * which drew a mirrored seam parallel to the edge.
 */
export function bevelShift(x: number): number {
  const t = Math.min(Math.max(x, 0), 1);
  return 1 - t * t * (3 - 2 * t);
}

/**
 * Depth inside the edge and outward normal of the bevel, measured on the panel's outline with its corners
 * rounded to at least `bezel`: a tighter corner gives the depth field a crease along the corner diagonal,
 * which showed as a line cutting the corner. Pixels between the true corner and the softened one count as
 * the very edge (depth 0).
 */
function bevelField(px: number, py: number, hw: number, hh: number, r: number, bezel: number): [number, number, number] {
  const rs = Math.min(Math.max(r, bezel), hw, hh);
  const d = Math.max(0, -sdRoundRect(px, py, hw, hh, rs));
  const [nx, ny] = normalRoundRect(px, py, hw, hh, rs);
  return [d, nx, ny];
}

/**
 * RGBA bytes (w·h·4), two lens terms added together (offsets in units of the filter's max offset):
 * - bevel (`rim` 0 … 1): inside the bezel the backdrop is sampled from further in, by bevelShift (largest
 *   at the edge, smooth to 0 where the glass turns flat) — objects bend and stretch around the rim;
 * - dome (`dome` 0 … 1): the whole slab is convex, so every point samples towards the centre by
 *   dome·|u|^1.5 (u = position / half size; 0 at the centre, `dome` at the edge) — a magnifying lens whose
 *   power grows towards the edge, so what is behind curves across the whole body, not only at the rim.
 * The sum is clamped to the encodable range.
 */
export function buildRefractionMap(w: number, h: number, r: number, bezel: number, dome = 0, rim = 1): Uint8ClampedArray {
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
        // |u|^1.5: the middle stays readable, the bend (and the magnification) grows towards the edge.
        const ux = px / hw;
        const uy = py / hh;
        const len = Math.hypot(ux, uy) || 1;
        const bend = dome * Math.min(1, Math.pow(len, 1.5));
        dx -= (ux / len) * bend;
        dy -= (uy / len) * bend;
      }
      if (bezel > 0 && d >= 0) {
        const [bd, nx, ny] = bevelField(px, py, hw, hh, rad, bezel);
        if (bd < bezel) {
          const k = rim * bevelShift(bd / bezel);
          dx -= nx * k;
          dy -= ny * k;
        }
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
 * that passed through the glass (weaker). `sheen` (0 … 1) adds the light lying inside the slab: a broad
 * soft pool under the lit corner and a fainter one in the far corner, as on a thick drop of water.
 * Painted by `::before`, so it brightens what is behind instead of greying it. `strength` scales every alpha.
 */
export function buildSpecularMap(
  w: number,
  h: number,
  r: number,
  bezel: number,
  strength: number,
  light: readonly [number, number] = KEY_LIGHT,
  sheen = 0,
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  if (strength <= 0 || (bezel <= 0 && sheen <= 0)) return data;
  const hw = w / 2;
  const hh = h / 2;
  const rad = Math.min(r, hw, hh);
  const [lx, ly] = light;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - hw;
      const py = y + 0.5 - hh;
      const d = -sdRoundRect(px, py, hw, hh, rad);
      if (d < 0) continue;
      let edge = 0;
      const [bd, nx, ny] = bezel > 0 ? bevelField(px, py, hw, hh, rad, bezel) : [d, 0, 0];
      if (bd < bezel) {
        const facing = nx * lx + ny * ly; // 1 where the edge faces the light, −1 on the far side
        // Key light on the facing edges, and the light that crossed the slab on the far edges (still clearly lit:
        // Apple's glass reads as raised because the whole rim glows, not only its lit side).
        const lobe = facing > 0 ? Math.pow(facing, 1.2) : 0.45 * Math.pow(-facing, 1.2);
        // A hairline, not a white band: the rim peaked at pure white and the bevel glow still doubled the
        // backdrop 10 px in, which read as a thick neon outline on every panel.
        const rim = Math.exp(-d / 1.2); // ~1 px line on the very edge, all the way round
        const glow = Math.pow(bezelProfile(bd / bezel), 2) * 0.3; // light travelling inside the bevel, fades fast
        edge = rim * (0.3 + 0.3 * lobe) + glow * (0.2 + 0.8 * lobe);
      }
      let body = 0;
      if (sheen > 0) {
        // Distance (in half sizes) from the lit corner and from the far corner of the slab.
        const ux = px / hw;
        const uy = py / hh;
        const near = (ux - lx) ** 2 + (uy - ly) ** 2;
        const far = (ux + lx) ** 2 + (uy + ly) ** 2;
        body = sheen * (Math.exp(-near / 0.5) + 0.45 * Math.exp(-far / 0.5));
      }
      const a = Math.min(1, strength * (1 - (1 - Math.min(1, edge)) * (1 - Math.min(1, body))));
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
