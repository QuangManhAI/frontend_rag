import { useEffect, useState, useSyncExternalStore } from 'react';
import { buildRefractionMap, buildSpecularMap } from '../../theme/refractionMap';

/**
 * Liquid Glass for every `<Glass refract="name">` panel (docs/FE_DESIGN_SYSTEM.md §10.5):
 * - level 2+: the bevel light, baked per size into a PNG and painted by `::before` (`--lg-light-map`) —
 *   a plain background, so it costs nothing per frame;
 * - level 3 (Chromium): plus an SVG filter `#lg-refract-<name>` that bends the backdrop through the bevel.
 * DOM only — lives outside the R3F <Canvas>.
 */
export const refractFilterId = (name: string) => `lg-refract-${name}`;
/** Kept for the chat column's E2E selectors. */
export const REFRACT_FILTER_ID = refractFilterId('chat');

// ---------------------------------------------------------------- registry of refracting surfaces
const targets = new Map<string, HTMLElement>();
let snapshot: ReadonlyArray<readonly [string, HTMLElement]> = [];
const listeners = new Set<() => void>();
const emit = () => {
  snapshot = [...targets.entries()];
  listeners.forEach((l) => l());
};

/** Called by Glass' ref: registers (el) or unregisters (null) a refracting surface. */
export function registerRefractTarget(name: string, el: HTMLElement | null): void {
  if (el) {
    if (targets.get(name) === el) return;
    targets.set(name, el);
  } else {
    if (!targets.has(name)) return;
    targets.delete(name);
  }
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => snapshot;

// ---------------------------------------------------------------- map cache
interface Maps {
  refraction: string;
  specular: string;
}

/** Recent maps by size; capped so resizing the window does not keep every PNG alive. */
const urlCache = new Map<string, Maps>();
/** Per refracting surface: its current map plus one previous size. */
const CACHE_PER_TARGET = 2;

function cachedMaps(key: string, make: () => Maps): Maps {
  const hit = urlCache.get(key);
  if (hit !== undefined) {
    urlCache.delete(key); // refresh recency
    urlCache.set(key, hit);
    return hit;
  }
  const maps = make();
  urlCache.set(key, maps);
  const max = CACHE_PER_TARGET * Math.max(1, targets.size);
  while (urlCache.size > max) urlCache.delete(urlCache.keys().next().value as string);
  return maps;
}

/** For tests: how many map pairs are kept, and the bound they must stay under. */
export const refractionCacheSize = () => urlCache.size;
export const refractionCacheMax = () => CACHE_PER_TARGET * Math.max(1, targets.size);

const px = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

function toDataUrl(data: Uint8ClampedArray, w: number, h: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.putImageData(new ImageData(new Uint8ClampedArray(data), w, h), 0, 0);
  return canvas.toDataURL('image/png');
}

const whenIdle = (cb: () => void): (() => void) => {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(cb, { timeout: 500 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(cb, 50);
  return () => window.clearTimeout(id);
};

// ---------------------------------------------------------------- one filter per surface
interface MapState extends Maps {
  w: number;
  h: number;
  /** feDisplacementMap scale: the largest offset is scale / 2. */
  scale: number;
}

function SurfaceGlass({ name, el, refract }: { name: string; el: HTMLElement; refract: boolean }) {
  const [map, setMap] = useState<MapState | null>(null);

  useEffect(() => {
    let cancelIdle = () => {};
    let timer = 0;
    const build = () => {
      const w = Math.round(el.offsetWidth);
      const h = Math.round(el.offsetHeight);
      if (w < 8 || h < 8) return;
      const root = getComputedStyle(document.documentElement);
      const radius = px(getComputedStyle(el).borderTopLeftRadius);
      // The bevel takes a share of the panel's short side (thick glass on a small tile too), capped by the token.
      const bezel = Math.round(Math.min(px(root.getPropertyValue('--lg-bezel')), 0.42 * Math.min(w, h)));
      const light = px(root.getPropertyValue('--lg-body-light'));
      const dome = px(root.getPropertyValue('--lg-dome'));
      const key = `${w}x${h}:${radius}:${bezel}:${light}:${dome}`;
      const maps = cachedMaps(key, () => ({
        refraction: toDataUrl(buildRefractionMap(w, h, radius, bezel, dome), w, h),
        specular: toDataUrl(buildSpecularMap(w, h, radius, bezel, light), w, h),
      }));
      // Largest offset scales with the bevel, so a thin top bar bends as hard as the chat column, not harder.
      const offset = Math.min(px(root.getPropertyValue('--lg-refraction')), 1.4 * bezel);
      setMap({ w, h, ...maps, scale: 2 * offset });
    };
    cancelIdle = whenIdle(build);
    if (typeof ResizeObserver === 'undefined') return () => cancelIdle(); // jsdom / very old engines
    const ro = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        cancelIdle();
        cancelIdle = whenIdle(build);
      }, 150);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      window.clearTimeout(timer);
      cancelIdle();
    };
  }, [el]);

  // The bevel light switches on once its map exists (index.css: [data-lit]).
  const specular = map?.specular;
  useEffect(() => {
    if (!specular) return;
    el.style.setProperty('--lg-light-map', `url("${specular}")`);
    el.dataset.lit = 'true';
    return () => {
      el.style.removeProperty('--lg-light-map');
      delete el.dataset.lit;
    };
  }, [specular, el]);

  // The surface switches to the filter only once it exists (index.css: [data-refract-ready]).
  const hasFilter = refract && map !== null;
  useEffect(() => {
    if (!hasFilter) return;
    el.style.setProperty('--lg-refract-url', `url(#${refractFilterId(name)})`);
    el.dataset.refractReady = 'true';
    return () => {
      el.style.removeProperty('--lg-refract-url');
      delete el.dataset.refractReady;
    };
  }, [hasFilter, el, name]);

  if (!map || !refract) return null;
  const { w, h, refraction, scale } = map;
  return (
    <filter
      id={refractFilterId(name)}
      x="0"
      y="0"
      width={w}
      height={h}
      filterUnits="userSpaceOnUse"
      primitiveUnits="userSpaceOnUse"
      colorInterpolationFilters="sRGB"
    >
      <feImage href={refraction} x="0" y="0" width={w} height={h} preserveAspectRatio="none" result="map" />
      <feDisplacementMap in="SourceGraphic" in2="map" scale={scale} xChannelSelector="R" yChannelSelector="G" />
    </filter>
  );
}

/**
 * Bevel light for every registered panel and, with `refract` (level 3), a hidden <svg> holding one
 * refraction filter per panel. Mount once, at level 2+.
 */
export function LiquidFilters({ refract }: { refract: boolean }) {
  const list = useSyncExternalStore(subscribe, getSnapshot);
  const ready = refract && list.length > 0;

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    root.dataset.lgRefract = 'ready';
    return () => {
      delete root.dataset.lgRefract;
    };
  }, [ready]);

  const surfaces = list.map(([name, el]) => <SurfaceGlass key={name} name={name} el={el} refract={refract} />);
  if (!refract) return <>{surfaces}</>; // SurfaceGlass renders nothing without a filter
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute', width: 0, height: 0 }} data-testid="liquid-filters">
      {surfaces}
    </svg>
  );
}
