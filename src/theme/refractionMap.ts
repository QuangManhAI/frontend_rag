/**
 * Displacement map for Liquid Glass level 3 (docs/FE_DESIGN_SYSTEM.md §10.5): a convex lens band along
 * the edge of a rounded rectangle. Pure — no DOM; LiquidFilters turns it into an <feImage>.
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
 * RGBA bytes (w·h·4). Inside the bezel the backdrop is sampled from further in (t² profile, strongest at
 * the edge), which reads as the glass magnifying its rim; beyond the bezel the map is neutral.
 */
export function buildRefractionMap(w: number, h: number, r: number, bezel: number): Uint8ClampedArray {
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
      if (bezel > 0 && d >= 0 && d < bezel) {
        const t = 1 - d / bezel;
        const k = t * t;
        const [nx, ny] = normalRoundRect(px, py, hw, hh, rad);
        dx = -nx * k;
        dy = -ny * k;
      }
      const i = (y * w + x) * 4;
      data[i] = Math.round(128 + 127 * dx);
      data[i + 1] = Math.round(128 + 127 * dy);
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
  }
  return data;
}
