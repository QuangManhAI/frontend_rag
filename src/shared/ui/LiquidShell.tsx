import { Glass as LiquidGlass, type GlassOptics, type GlassProps } from '@samasante/liquid-glass';
import { cloneElement, type CSSProperties, type ReactElement } from 'react';
import { useGlassLevel } from '../theme/useLiquidLight';
import { useTheme } from '../theme/useTheme';
import type { ThemeName } from '../theme/tokens';
import { DARK_OPTICS } from './LiquidShell.dark';
import { LIGHT_OPTICS } from './LiquidShell.light';

/** The floating panels that carry a liquid-glass lens. */
export type LiquidPanel = 'chat' | 'topbar' | 'legend' | 'settings';

/** One optics file per theme: LiquidShell.dark.ts (night sky) and LiquidShell.light.ts (clear day sky). */
const OPTICS: Record<ThemeName, Record<LiquidPanel, Partial<GlassOptics>>> = { dark: DARK_OPTICS, light: LIGHT_OPTICS };

/** A panel's optics for a theme. */
export function liquidOptics(panel: LiquidPanel, theme: ThemeName): Partial<GlassOptics> {
  return OPTICS[theme][panel];
}

/** The library's wrapper with one panel's optics for the active theme. */
export function LiquidLens({ panel, ...props }: Omit<GlassProps, 'optics'> & { panel: LiquidPanel }) {
  const theme = useTheme().name;
  return <LiquidGlass {...props} optics={liquidOptics(panel, theme)} />;
}

/**
 * At Liquid Glass level 3, wraps one `<Glass refract>` panel in the library's lens; below that, renders the
 * panel as is. The wrapper bends the backdrop, so the panel is marked `data-lgr` and drops its own backdrop
 * filter (index.css): a backdrop-filtered child of a backdrop-filtered box would only see the box, not the
 * world. Layout that must move with the glass (width, entry animation) goes on the wrapper via `className`.
 */
export function LiquidShell({
  panel,
  className,
  style,
  children,
}: {
  panel: LiquidPanel;
  className?: string;
  style?: CSSProperties;
  children: ReactElement<{ 'data-lgr'?: boolean }>;
}) {
  const liquid = useGlassLevel() === 3;
  if (!liquid) return children;
  return (
    <LiquidLens panel={panel} className={className} style={style}>
      {cloneElement(children, { 'data-lgr': true })}
    </LiquidLens>
  );
}
