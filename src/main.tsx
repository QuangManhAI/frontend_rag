import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { applyCssVars } from './theme/applyCssVars';
import { themes } from './theme/tokens';
import { useUi } from './store/uiStore';
import './index.css';

// Dev/E2E hook: inspect stores from the console (`__rkt.rag.getState()`).
if (import.meta.env.DEV) {
  void Promise.all([import('./store/ragStore'), import('./store/fxStore'), import('./store/worldStore')]).then(([r, f, w]) => {
    Object.assign(globalThis, { __rkt: { rag: r.useRag, fx: f.useFx, world: w.useWorld, ui: useUi } });
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
