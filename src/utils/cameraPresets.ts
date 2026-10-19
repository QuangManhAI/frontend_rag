import type { Vec3 } from '../types/world';

export type CameraMode = 'overview' | 'canopy' | 'ground' | 'follow' | 'focus';

export interface CameraPreset {
  position: Vec3;
  target: Vec3;
}

export interface PresetContext {
  /** Point to follow / focus; ignored by fixed modes. */
  point?: Vec3 | null;
  /** Narrow viewports pull the camera back a bit. */
  aspect?: number;
}

export const FOCUS_DISTANCE = 20;
const FOLLOW_OFFSET: Vec3 = [26, 22, 26];
const FOLLOW_DISTANCE = 80;

/** Camera position + look target for a mode. */
export function getPreset(mode: CameraMode, ctx: PresetContext = {}): CameraPreset {
  const widen = ctx.aspect !== undefined && ctx.aspect < 1 ? 1.45 : 1;
  switch (mode) {
    case 'overview': {
      const d = 205 * widen;
      const pitch = (30 * Math.PI) / 180;
      const target: Vec3 = [0, 48, 0];
      return { position: [d * Math.cos(pitch) * 0.5, target[1] + d * Math.sin(pitch), d * Math.cos(pitch) * 0.87], target };
    }
    case 'canopy':
      return { position: [0, 150 * widen, 118 * widen], target: [0, 98, 0] };
    case 'ground':
      return { position: [58 * widen, 9, 62 * widen], target: [0, -7, 0] };
    case 'follow': {
      // Stay outside the canopy: step radially away from the trunk axis, a bit above the orb.
      const p = ctx.point ?? [0, 90, 0];
      const h = Math.hypot(p[0], p[2]);
      const out = h > 6 ? [p[0] / h, p[2] / h] : [FOLLOW_OFFSET[0] / Math.hypot(FOLLOW_OFFSET[0], FOLLOW_OFFSET[2]), FOLLOW_OFFSET[2] / Math.hypot(FOLLOW_OFFSET[0], FOLLOW_OFFSET[2])];
      const d = FOLLOW_DISTANCE * widen;
      return { position: [p[0] + out[0] * d, p[1] + FOLLOW_OFFSET[1], p[2] + out[1] * d], target: p };
    }
    case 'focus': {
      const p = ctx.point ?? [0, 90, 0];
      // Step outward from the trunk axis and swing 35° sideways so branches don't block the view.
      let hx = p[0];
      let hz = p[2];
      const h = Math.hypot(hx, hz);
      if (h < 1e-6) {
        hx = 1;
        hz = 0;
      } else {
        hx /= h;
        hz /= h;
      }
      const a = (35 * Math.PI) / 180;
      const rx = hx * Math.cos(a) - hz * Math.sin(a);
      const rz = hx * Math.sin(a) + hz * Math.cos(a);
      const up = 0.85;
      const n = Math.hypot(rx, up, rz);
      const k = (FOCUS_DISTANCE * widen) / n;
      return { position: [p[0] + rx * k, p[1] + up * k, p[2] + rz * k], target: p };
    }
  }
}
