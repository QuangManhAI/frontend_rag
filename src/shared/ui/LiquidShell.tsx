import { Glass as LiquidGlass, type GlassOptics, type GlassProps } from '@samasante/liquid-glass';
import { cloneElement, type CSSProperties, type ReactElement } from 'react';
import { useGlassLevel } from '../theme/useLiquidLight';

/*
 * Optics of the @samasante/liquid-glass lens, one set per floating panel, tuned by hand in the library's
 * settings panel. The library scales them with the panel: `strength` by its diagonal, `curvature` by its short
 * side, so the same numbers bend a 49 px top bar far less than the chat column.
 */

/** Chat dock (layout/AppShell.tsx ChatDock), ~410 × 774 px. */
export const LIQUID_OPTICS_CHAT: Partial<GlassOptics> = {
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
  // Background
  glow: 0.3,
  frost: 7,
  brightness: 0,
};

/** Top bar (layout/TopBar.tsx), full width × ~49 px. */
export const LIQUID_OPTICS_TOPBAR: Partial<GlassOptics> = {
  // Refraction
  strength: 0.2,
  depth: 0.1,
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
  // Background
  glow: 0.3,
  frost: 7,
  brightness: 0,
};

/** "Loại bài báo" (layout/CategoryLegend.tsx), ~256 × 280 px. */
export const LIQUID_OPTICS_LEGEND: Partial<GlassOptics> = {
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
  // Background
  glow: 0.3,
  frost: 7,
  brightness: 0,
};

/** Settings (layout/SettingsPanel.tsx), ~320 × 764 px. */
export const LIQUID_OPTICS_SETTINGS: Partial<GlassOptics> = {
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
  // Background
  glow: 0.3,
  frost: 7,
  brightness: 0,
};

/** The library's wrapper with one panel's optics. */
export function LiquidLens(props: GlassProps & { optics: Partial<GlassOptics> }) {
  return <LiquidGlass {...props} />;
}

/**
 * At Liquid Glass level 3, wraps one `<Glass refract>` panel in the library's lens; below that, renders the
 * panel as is. The wrapper bends the backdrop, so the panel is marked `data-lgr` and drops its own backdrop
 * filter (index.css): a backdrop-filtered child of a backdrop-filtered box would only see the box, not the
 * world. Layout that must move with the glass (width, entry animation) goes on the wrapper via `className`.
 */
export function LiquidShell({
  optics,
  className,
  style,
  children,
}: {
  optics: Partial<GlassOptics>;
  className?: string;
  style?: CSSProperties;
  children: ReactElement<{ 'data-lgr'?: boolean }>;
}) {
  const liquid = useGlassLevel() === 3;
  if (!liquid) return children;
  return (
    <LiquidLens optics={optics} className={className} style={style}>
      {cloneElement(children, { 'data-lgr': true })}
    </LiquidLens>
  );
}
