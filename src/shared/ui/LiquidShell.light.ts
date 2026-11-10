import type { GlassOptics } from '@samasante/liquid-glass';
import type { LiquidPanel } from './LiquidShell';

/*
 * Light theme optics: the panels float over a bright, clear blue day sky, so the glass is clear rather than
 * frosted — barely any blur (the sky and the flowers stay sharp behind the pane), no inner glow (it read as a
 * grey veil on a light backdrop), a slightly more vivid backdrop, and a crisper edge sheen and specular so the
 * pane still reads as glass. No drop shadow either (index.css: light theme). Dark theme: LiquidShell.dark.ts.
 */

const BASE: Partial<GlassOptics> = {
  // Refraction (same lens shape as the dark set)
  strength: 0.2,
  depth: 0.02,
  curvature: 0.7,
  dispersion: 1,
  // Edge
  bend: 0,
  bendWidth: 0.26,
  // Sheen: brighter, so the clear pane still shows its edge against the sky.
  sheen: 0.75,
  sheenWidth: 1,
  specular: 0.85,
  sheenAngle: 55,
  // Background: clear glass.
  glow: 0,
  frost: 1.5,
  brightness: 0,
  saturate: 1.15,
};

export const LIGHT_OPTICS: Record<LiquidPanel, Partial<GlassOptics>> = {
  /** Chat dock (layout/ChatDock.tsx), ~410 × 774 px. */
  chat: { ...BASE },
  /** Top bar (layout/TopBar.tsx), full width × ~49 px. */
  topbar: { ...BASE, depth: 0.1 },
  /** "Loại bài báo" (layout/CategoryLegend.tsx), ~256 × 280 px. */
  legend: { ...BASE },
  /** Settings (layout/SettingsPanel.tsx), ~320 × 764 px. It opens over the legend, so it keeps some frost:
   *  with clear glass the legend's text showed through and tangled with the settings. */
  settings: { ...BASE, frost: 6 },
};
