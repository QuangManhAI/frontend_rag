import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { applyCssVars } from './theme/applyCssVars';
import { themes } from './theme/tokens';
import { useUi } from './store/uiStore';
import { PERF_ENABLED, perfStats } from './utils/perfProbe';
import './index.css';

// Dev/E2E/bench hook: inspect stores from the console (`__rkt.rag.getState()`); `?bench` enables it in builds.
if (PERF_ENABLED) {
  void Promise.all([import('./store/ragStore'), import('./store/fxStore'), import('./store/worldStore'), import('./store/crawlStore'), import('./store/crawlFx')]).then(([r, f, w, c, cf]) => {
    Object.assign(globalThis, { __rkt: { rag: r.useRag, fx: f.useFx, world: w.useWorld, ui: useUi, crawl: c.useCrawl, crawlFx: cf.crawlFx, perf: perfStats } });
  });
}

// Paint the right theme before React mounts (no dark→light flash).
applyCssVars(themes[useUi.getState().theme]);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find root element');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
