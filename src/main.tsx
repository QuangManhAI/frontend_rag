import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { applyCssVars } from './shared/theme/applyCssVars';
import { themes } from './shared/theme/tokens';
import { currentThemeName } from './shared/theme/useTheme';
import { useUi } from './shared/store/uiStore';
import { PERF_ENABLED, perfStats } from './shared/lib/perfProbe';
import './index.css';

// Dev/E2E/bench hook: inspect stores from the console (`__rkt.rag.getState()`); `?bench` enables it in builds.
if (PERF_ENABLED) {
  void Promise.all([import('./features/chat/store/ragStore'), import('./features/world/store/fxStore'), import('./features/world/store/worldStore'), import('./features/crawl/crawlStore'), import('./features/crawl/crawlFx')]).then(([r, f, w, c, cf]) => {
    Object.assign(globalThis, { __rkt: { rag: r.useRag, fx: f.useFx, world: w.useWorld, ui: useUi, crawl: c.useCrawl, crawlFx: cf.crawlFx, perf: perfStats } });
  });
}

// Paint the resolved theme (saved mode or OS preference) before React mounts: no dark→light flash.
applyCssVars(themes[currentThemeName()]);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find root element');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
