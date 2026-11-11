import type { GlassOptics } from '@samasante/liquid-glass';
import type { LiquidPanel } from './LiquidShell';

/*
 * Light theme optics: the panels float over a bright, clear blue day sky, so the glass is clear rather than
 * frosted — barely any blur (the sky and the flowers stay sharp behind the pane), no inner glow (it read as a
 * grey veil on a light backdrop), a slightly more vivid backdrop, and a crisper edge sheen and specular so the
 * pane still reads as glass. No drop shadow either (index.css: light theme). Dark theme: LiquidShell.dark.ts.
 */

const BASE: Partial<GlassOptics> = {
  // Refraction: ultra-gentle edge refraction without grabbing outside pixels or casting dark edge shades
  strength: 0.02,
  depth: 0.05,
  curvature: 0,
  dispersion: 0,
  // Edge: clean, minimal meniscus without muddy chromatic fringing
  bend: 0,
  bendWidth: 0.05,
  // Sheen & specular: subtle pearl-white highlight on the lit edge
  sheen: 0.04,
  sheenWidth: 1,
  specular: 0.2,
  sheenAngle: 55,
  // Background: 100% crystal-clear, transparent glass without milky veil, frost, or center opacity
  glow: 0,
  frost: 0,
  brightness: 0,
  saturate: 1.0,
};

export const LIGHT_OPTICS: Record<LiquidPanel, Partial<GlassOptics>> = {
  /** Chat dock (layout/ChatDock.tsx), ~410 × 774 px. */
  chat: { ...BASE },
  /** Top bar (layout/TopBar.tsx), full width × ~49 px. */
  topbar: { ...BASE, depth: 0.04 },
  /** "Loại bài báo" (layout/CategoryLegend.tsx), ~256 × 280 px. */
  legend: { ...BASE },
  /** Settings (layout/SettingsPanel.tsx), ~320 × 764 px. Clean transparent glass. */
  settings: { ...BASE },
};
