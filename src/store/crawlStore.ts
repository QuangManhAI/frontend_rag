import { create } from 'zustand';
import { mockCrawlControl, streamCrawl } from '../api/crawlClient';
import type { CrawlConnection, CrawlStatus, CrawlStreamEvent } from '../types/crawl';
import type { FlowQuality } from '../utils/crawlFlow';
import { readStorage, writeStorage } from '../utils/storage';
import { applyDueArrivals, crawlBus, crawlFx, nowSec, RISE_DURATION, scheduleArrival } from './crawlFx';
import { useUi } from './uiStore';
import { useWorld } from './worldStore';

/** After the crawl stops, streams finish and fade for this long before the effect unmounts. */
export const FADE_MS = 2000;
const RISE_KEY = 'rkt.crawlRise';

/** Particle budget for the current quality mode / adaptive tier. */
export function flowQuality(): FlowQuality {
  const { settings, qualityTier } = useUi.getState();
  if (settings.quality === 'low') return 'low';
  if (settings.quality === 'high') return 'high';
  return qualityTier >= 2 ? 'low' : 'high';
}

interface CrawlState {
  status: CrawlStatus | null;
  connection: CrawlConnection;
  listening: boolean;
  /** Effects mounted (crawling, or still fading out). */
  visualActive: boolean;
  /** Crawl stopped, effects fading. */
  fading: boolean;
  showRise: boolean;
  lastError: string | null;
  done: boolean;
  /** Dev/mock knobs mirrored for the HUD. */
  mock: { running: boolean; ratePerMin: number; offline: boolean };
  startListening: () => void;
  stopListening: () => void;
  setShowRise: (v: boolean) => void;
  setMock: (patch: Partial<CrawlState['mock']>) => void;
}

let controller: AbortController | null = null;
let fadeTimer: ReturnType<typeof setTimeout> | null = null;
let arrivalTimer: ReturnType<typeof setInterval> | null = null;

export const useCrawl = create<CrawlState>((set, get) => {
  const beginVisual = () => {
    if (fadeTimer) clearTimeout(fadeTimer);
    fadeTimer = null;
    if (!get().visualActive || get().fading) set({ visualActive: true, fading: false });
  };
  const endVisual = () => {
    if (!get().visualActive || fadeTimer) return;
    set({ fading: true });
    const wait = Math.max(0, crawlFx.lastEnd - nowSec()) * 1000 + FADE_MS;
    fadeTimer = setTimeout(() => {
      fadeTimer = null;
      applyDueArrivals(nowSec());
      set({ visualActive: false, fading: false });
    }, wait);
  };

  const handle = (ev: CrawlStreamEvent) => {
    const reduce = useUi.getState().settings.reduceMotion;
    switch (ev.type) {
      case 'crawl_status': {
        const { type: _t, ...status } = ev;
        set({ status, done: false });
        if (status.running) beginVisual();
        else endVisual();
        break;
      }
      case 'crawl_batch':
        crawlFx.flowing.set(ev.category_index, nowSec());
        if (crawlFx.streamsLive && !reduce) {
          for (const l of crawlBus.batch) l(ev);
        } else if (ev.stage === 'fetched') {
          // No particles (reduce motion / not mounted yet): crates and tiles react directly.
          scheduleArrival(ev.crate_id, ev.count, nowSec());
        }
        break;
      case 'crawl_vectors': {
        const rise = get().showRise && crawlFx.riseLive && !reduce && flowQuality() === 'high';
        const born = nowSec() + (rise ? RISE_DURATION : 0.15);
        useWorld.getState().appendVectors(ev.items, born);
        if (rise) for (const l of crawlBus.vectors) l(ev.items, born);
        break;
      }
      case 'crawl_error':
        set({ lastError: ev.message });
        break;
      case 'crawl_done':
        set((s) => ({ done: true, status: s.status ? { ...s.status, running: false, fetched: ev.fetched, embedded: ev.embedded } : s.status }));
        endVisual();
        break;
    }
  };

  return {
    status: null,
    connection: 'offline',
    listening: false,
    visualActive: false,
    fading: false,
    showRise: readStorage(RISE_KEY) !== 'false',
    lastError: null,
    done: false,
    mock: { ...mockCrawlControl },

    startListening: () => {
      if (controller) return;
      const ctrl = new AbortController();
      controller = ctrl;
      set({ listening: true, connection: 'reconnecting' });
      arrivalTimer = setInterval(() => applyDueArrivals(nowSec()), 250);
      void (async () => {
        for await (const ev of streamCrawl(ctrl.signal, {
          onConnection: (connection) => {
            set({ connection });
            if (connection === 'reconnecting') endVisual();
          },
        })) {
          handle(ev);
        }
      })();
    },
    stopListening: () => {
      controller?.abort();
      controller = null;
      if (arrivalTimer) clearInterval(arrivalTimer);
      arrivalTimer = null;
      set({ listening: false, connection: 'offline' });
      endVisual();
    },
    setShowRise: (showRise) => {
      writeStorage(RISE_KEY, String(showRise));
      set({ showRise });
    },
    setMock: (patch) => {
      Object.assign(mockCrawlControl, patch);
      set({ mock: { ...mockCrawlControl } });
    },
  };
});
