import { useEffect, useMemo, useState } from 'react';
import { useUi } from '../store/uiStore';
import type { Rotor } from '../utils/rotation';
import { detectLevel, LIGHT_REST, lightFromPointer, nlerp, readEnv, type LgLevel } from './liquidGlass';

const MEDIA = ['(prefers-reduced-transparency: reduce)', '(prefers-contrast: more)'] as const;

/** Current Liquid Glass level from the setting, quality state and OS accessibility media queries. */
export function useGlassLevelValue(): LgLevel {
  const setting = useUi((s) => s.settings.glass);
  const quality = useUi((s) => s.settings.quality);
  const tier = useUi((s) => s.qualityTier);
  const [mediaTick, setMediaTick] = useState(0);
  useEffect(() => {
    const lists = MEDIA.map((q) => globalThis.matchMedia?.(q)).filter((m): m is MediaQueryList => !!m);
    const bump = () => setMediaTick((n) => n + 1);
    lists.forEach((m) => m.addEventListener?.('change', bump));
    return () => lists.forEach((m) => m.removeEventListener?.('change', bump));
  }, []);
  // mediaTick re-reads the media queries after an OS accessibility toggle.
  return useMemo(() => detectLevel(readEnv(quality, tier), setting), [quality, tier, setting, mediaTick]);
}

/** Same level, mirrored on <html data-lg-level> for the CSS (FE_DESIGN_SYSTEM §10.5). Mount once. */
export function useGlassLevel(root: HTMLElement = document.documentElement): LgLevel {
  const level = useGlassLevelValue();
  useEffect(() => {
    root.dataset.lgLevel = String(level);
  }, [level, root]);
  return level;
}

/** Surfaces that draw the specular rim (see `.glass::after` in index.css). */
export const LIT_SURFACES = '.glass[data-shape="panel"], .glass[data-interactive="true"]';

function writeLight(scope: ParentNode, r: Rotor): void {
  const x = r.re.toFixed(3);
  const y = r.im.toFixed(3);
  scope.querySelectorAll<HTMLElement>(LIT_SURFACES).forEach((el) => {
    el.style.setProperty('--lg-light-x', x);
    el.style.setProperty('--lg-light-y', y);
  });
}

/**
 * Specular light follows the pointer (level ≥ 2): the direction is a rotor eased with nlerp and
 * written at most once per animation frame onto the lit glass surfaces only — the properties are
 * registered non-inherited, so no React state, no re-render and no document-wide style recalc.
 */
export function useLiquidLight(active: boolean, scope: ParentNode = document): void {
  useEffect(() => {
    if (!active) {
      writeLight(scope, LIGHT_REST);
      return;
    }
    let target = LIGHT_REST;
    let current = LIGHT_REST;
    let frame = 0;
    const tick = () => {
      frame = 0;
      current = nlerp(current, target, 0.25);
      writeLight(scope, current);
      if (Math.abs(current.re - target.re) + Math.abs(current.im - target.im) > 1e-3) frame = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      target = lightFromPointer(e.clientX, e.clientY, window.innerWidth, window.innerHeight);
      if (!frame) frame = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
      writeLight(scope, LIGHT_REST);
    };
  }, [active, scope]);
}
