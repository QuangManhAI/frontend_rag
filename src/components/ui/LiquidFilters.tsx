import { useEffect, useState, type RefObject } from 'react';
import { buildRefractionMap } from '../../theme/refractionMap';

/** SVG filter id referenced by `.glass[data-refract="chat"]::before` at Liquid Glass level 3. */
export const REFRACT_FILTER_ID = 'lg-refract-chat';

interface MapState {
  w: number;
  h: number;
  url: string;
  /** feDisplacementMap scale: the largest offset is scale / 2. */
  scale: number;
  chroma: number;
}

/** Recent maps by size; capped so resizing the window does not keep every PNG alive. */
const urlCache = new Map<string, string>();
const CACHE_MAX = 4;

function cachedMap(key: string, make: () => string): string {
  const hit = urlCache.get(key);
  if (hit !== undefined) {
    urlCache.delete(key); // refresh recency
    urlCache.set(key, hit);
    return hit;
  }
  const url = make();
  urlCache.set(key, url);
  if (urlCache.size > CACHE_MAX) urlCache.delete(urlCache.keys().next().value as string);
  return url;
}

/** For tests: how many maps are kept. */
export const refractionCacheSize = () => urlCache.size;
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

/**
 * Hidden <svg> with the refraction filter of the chat column (Liquid Glass level 3, Chromium only).
 * The displacement map is built after first paint, rebuilt (debounced) when the column resizes and
 * cached per size; `<html data-lg-refract="ready">` switches the CSS on only once the filter exists.
 * DOM only — lives outside the R3F <Canvas>.
 */
export function LiquidFilters({ target }: { target: RefObject<HTMLElement | null> }) {
  const [map, setMap] = useState<MapState | null>(null);

  useEffect(() => {
    const el = target.current;
    if (!el) return;
    let cancelIdle = () => {};
    let timer = 0;
    const build = () => {
      const w = Math.round(el.offsetWidth);
      const h = Math.round(el.offsetHeight);
      if (w < 8 || h < 8) return;
      const root = getComputedStyle(document.documentElement);
      const radius = px(getComputedStyle(el).borderTopLeftRadius);
      const bezel = px(root.getPropertyValue('--lg-bezel'));
      const key = `${w}x${h}:${radius}:${bezel}`;
      const url = cachedMap(key, () => toDataUrl(buildRefractionMap(w, h, radius, bezel), w, h));
      setMap({ w, h, url, scale: 2 * px(root.getPropertyValue('--lg-refraction')), chroma: 2 * px(root.getPropertyValue('--lg-chroma')) });
    };
    cancelIdle = whenIdle(build);
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
  }, [target]);

  useEffect(() => {
    if (!map) return;
    const root = document.documentElement;
    root.dataset.lgRefract = 'ready';
    return () => {
      delete root.dataset.lgRefract;
    };
  }, [map]);

  if (!map) return null;
  const { w, h, url, scale, chroma } = map;
  const channel = (k: 0 | 1 | 2) => `${k === 0 ? 1 : 0} 0 0 0 0  0 ${k === 1 ? 1 : 0} 0 0 0  0 0 ${k === 2 ? 1 : 0} 0 0  0 0 0 1 0`;
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute', width: 0, height: 0 }} data-testid="liquid-filters">
      <filter id={REFRACT_FILTER_ID} x="0" y="0" width={w} height={h} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feImage href={url} x="0" y="0" width={w} height={h} preserveAspectRatio="none" result="map" />
        {chroma > 0 ? (
          <>
            {/* Chromatic edge: red bends a little more, blue a little less (§10.3 --lg-chroma). */}
            <feDisplacementMap in="SourceGraphic" in2="map" scale={scale + chroma} xChannelSelector="R" yChannelSelector="G" result="dr" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale={scale} xChannelSelector="R" yChannelSelector="G" result="dg" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale={Math.max(0, scale - chroma)} xChannelSelector="R" yChannelSelector="G" result="db" />
            <feColorMatrix in="dr" type="matrix" values={channel(0)} result="r" />
            <feColorMatrix in="dg" type="matrix" values={channel(1)} result="g" />
            <feColorMatrix in="db" type="matrix" values={channel(2)} result="b" />
            <feComposite in="r" in2="g" operator="arithmetic" k2="1" k3="1" result="rg" />
            <feComposite in="rg" in2="b" operator="arithmetic" k2="1" k3="1" />
          </>
        ) : (
          <feDisplacementMap in="SourceGraphic" in2="map" scale={scale} xChannelSelector="R" yChannelSelector="G" />
        )}
      </filter>
    </svg>
  );
}
