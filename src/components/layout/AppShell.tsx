import { Filter, X } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useUi } from '../../store/uiStore';
import { useWorld } from '../../store/worldStore';
import { ChatPanel, ChatReopenButton } from '../chat/ChatPanel';
import { PaperPanel } from '../result/PaperPanel';
import { VectorTooltip } from '../world/canopy/VectorTooltip';
import { WorldOverlay } from '../world/overlay/WorldOverlay';
import { useCrawl } from '../../store/crawlStore';
import { CategoryLegend } from './CategoryLegend';
import { HealthBanner, useHealth } from './HealthBanner';
import { SettingsPanel } from './SettingsPanel';
import { TopBar } from './TopBar';
import { WorldError } from './WorldError';

// Preload WorldCanvas chunk in parallel during initial paint
const worldCanvasPromise = import('../world/WorldCanvas');
const WorldCanvas = lazy(() => worldCanvasPromise);

function useIsMobile(): boolean {
  const query = '(max-width: 767px)';
  const [mobile, setMobile] = useState(() => globalThis.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const mq = globalThis.matchMedia?.(query);
    if (!mq) return;
    const on = () => setMobile(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return mobile;
}

const introDelay = (s: number) => ({ '--intro-delay': `${s}s` }) as CSSProperties;

/**
 * Desktop chat column. Stays mounted while it slides out so the close is animated too;
 * the first open (page load) waits a beat so it follows the top bar in.
 */
function ChatDock() {
  const chatOpen = useUi((s) => s.chatOpen);
  const [mounted, setMounted] = useState(chatOpen);
  const firstOpen = useRef(true);
  useEffect(() => {
    if (chatOpen) setMounted(true);
  }, [chatOpen]);
  const closing = mounted && !chatOpen;

  if (!mounted) {
    return (
      <div className="self-start fade-in">
        <ChatReopenButton />
      </div>
    );
  }
  return (
    <div
      className={`glass w-[32vw] min-w-[340px] max-w-[520px] h-full overflow-hidden ${closing ? 'chat-slide-out' : 'chat-slide-in'}`}
      style={firstOpen.current && !closing ? introDelay(0.15) : undefined}
      aria-hidden={closing || undefined}
      data-testid="chat-dock"
      onAnimationEnd={(e) => {
        if (e.target !== e.currentTarget) return; // ignore animations of children
        firstOpen.current = false;
        if (closing) setMounted(false);
      }}
    >
      <ChatPanel onCollapse={() => useUi.getState().setChatOpen(false)} />
    </div>
  );
}

function FilterChip() {
  const label = useUi((s) => s.highlightLabel);
  if (!label) return null;
  return (
    <div className="glass glass-strong flex items-center gap-2 px-3 py-1.5 text-xs fade-in" data-testid="filter-chip">
      <Filter size={14} className="text-[var(--accent)]" />
      Đang lọc: <span className="mono">{label.label}</span>
      <button type="button" className="btn btn-icon !p-0.5" aria-label="Bỏ lọc (Esc)" onClick={() => useUi.getState().setHighlights(null, null)}>
        <X size={14} />
      </button>
    </div>
  );
}

/** Mobile chat: bottom sheet with a drag handle snapping between peek / half / full. */
function BottomSheet() {
  const [height, setHeight] = useState(42);
  const drag = useRef<{ y: number; h: number } | null>(null);
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 glass glass-strong !rounded-b-none flex flex-col intro-up" style={{ height: `${height}vh`, ...introDelay(0.15) }}>
      <div
        className="py-2 grid place-items-center cursor-grab touch-none"
        role="slider"
        aria-label="Kéo để thay đổi chiều cao chat"
        aria-valuemin={12}
        aria-valuemax={88}
        aria-valuenow={Math.round(height)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') setHeight((h) => Math.min(88, h + 10));
          if (e.key === 'ArrowDown') setHeight((h) => Math.max(12, h - 10));
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { y: e.clientY, h: height };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const dy = ((drag.current.y - e.clientY) / window.innerHeight) * 100;
          setHeight(Math.max(12, Math.min(88, drag.current.h + dy)));
        }}
        onPointerUp={() => {
          drag.current = null;
          setHeight((h) => [12, 42, 88].reduce((a, b) => (Math.abs(b - h) < Math.abs(a - h) ? b : a)));
        }}
      >
        <span className="block h-1.5 w-12 rounded-full bg-[color-mix(in_srgb,var(--ink)_30%,transparent)]" />
      </div>
      <div className="flex-1 min-h-0">
        <ChatPanel />
      </div>
    </div>
  );
}

export function AppShell() {
  const status = useWorld((s) => s.status);
  const error = useWorld((s) => s.error);
  const panelOpen = useUi((s) => s.panelPaperId !== null);
  const health = useHealth();

  // Listen to the crawl stream once the world is in place (reconnects on its own).
  useEffect(() => {
    if (status !== 'ready') return;
    useCrawl.getState().startListening();
    return () => useCrawl.getState().stopListening();
  }, [status]);
  const mobile = useIsMobile();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const ui = useUi.getState();
      if (ui.settingsOpen) ui.setSettingsOpen(false);
      else if (ui.panelPaperId || ui.focusedPaperId) ui.closeFocus();
      else if (ui.highlights) ui.setHighlights(null, null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[var(--bg)] text-[var(--ink)]">
      <div className={`absolute inset-x-0 top-0 ${mobile ? 'bottom-[12vh]' : 'bottom-0'}`}>
        {status === 'ready' && (
          <Suspense fallback={null}>
            <WorldCanvas />
            <WorldOverlay />
          </Suspense>
        )}
      </div>
      {status === 'error' && <WorldError error={error ?? 'lỗi không xác định'} onRetry={() => void useWorld.getState().load()} />}

      <div className="absolute inset-x-3 top-3 z-20 flex flex-col gap-2 pointer-events-none [&>*]:pointer-events-auto intro-down">
        <TopBar health={health} />
        <div className="flex flex-wrap items-start gap-2">
          <HealthBanner health={health} />
        </div>
      </div>

      <div className="absolute right-3 top-[4.6rem] z-30">
        <SettingsPanel />
      </div>

      {!mobile && (
        <div className="absolute left-3 top-[4.6rem] bottom-3 z-20 flex">
          <ChatDock />
        </div>
      )}
      {mobile && <BottomSheet />}

      {panelOpen && (
        <div className={`absolute z-30 ${mobile ? 'inset-x-2 top-16 bottom-[14vh]' : 'right-3 top-[4.6rem] bottom-3 w-[min(420px,34vw)] min-w-[320px]'}`}>
          <PaperPanel />
        </div>
      )}

      {status === 'ready' && (
        <div
          style={introDelay(0.35)}
          className={`absolute z-10 flex flex-col items-end gap-2 pointer-events-none [&>*]:pointer-events-auto intro-up ${mobile ? 'right-2 top-16' : 'bottom-3'} ${
            !mobile && panelOpen ? 'right-[calc(min(420px,34vw)+1.5rem)]' : !mobile ? 'right-3' : ''
          }`}
        >
          <FilterChip />
          <CategoryLegend />
        </div>
      )}

      <VectorTooltip />
    </div>
  );
}
