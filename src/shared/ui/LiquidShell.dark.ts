import type { GlassOptics } from '@samasante/liquid-glass';
import type { LiquidPanel } from './LiquidShell';

/*
 * Dark theme optics of the @samasante/liquid-glass lens, one set per floating panel, tuned by hand in the
 * library's settings panel over the night sky. The library scales them with the panel: `strength` by its
 * diagonal, `curvature` by its short side, so the same numbers bend a 49 px top bar far less than the chat column.
 * The light theme has its own file: LiquidShell.light.ts.
 */

const BASE: Partial<GlassOptics> = {
  // Refraction
  strength: 0.2,
  depth: 0.02,
  curvature: 0.7,
  dispersion: 1,
  // Edge
  bend: 0,
  bendWidth: 0.26,
  // Sheen
  sheen: 0.5,
  sheenWidth: 1,
  specular: 0.6,
  sheenAngle: 55,
  // Background: some frost and inner glow lift the panel off the near-black sky.
  glow: 0.3,
  frost: 7,
  brightness: 0,
};

export const DARK_OPTICS: Record<LiquidPanel, Partial<GlassOptics>> = {
  /** Chat dock (layout/ChatDock.tsx), ~410 × 774 px. */
  chat: { ...BASE },
  /** Top bar (layout/TopBar.tsx), full width × ~49 px: a deeper refraction band on the thin bar. */
  topbar: { ...BASE, depth: 0.1 },
  /** "Loại bài báo" (layout/CategoryLegend.tsx), ~256 × 280 px. */
  legend: { ...BASE },
  /** Settings (layout/SettingsPanel.tsx), ~320 × 764 px. */
  settings: { ...BASE },
};
