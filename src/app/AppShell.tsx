import { lazy, Suspense, useEffect } from 'react';
import { useUi } from '../shared/store/uiStore';
import { useWorld } from '../features/world/store/worldStore';
import { PaperPanel } from '../features/result/PaperPanel';
import { VectorTooltip } from '../features/world/scene/canopy/VectorTooltip';
import { WorldOverlay } from '../features/world/scene/overlay/WorldOverlay';
import { useCrawl } from '../features/crawl/crawlStore';
import { CategoryLegend } from './layout/CategoryLegend';
import { HealthBanner, useHealth } from './layout/HealthBanner';
import { SettingsPanel } from './layout/SettingsPanel';
import { TopBar } from './layout/TopBar';
import { WorldError } from './layout/WorldError';
import { useGlassLevel, useLiquidLight } from '../shared/theme/useLiquidLight';
import { LiquidFilters } from '../shared/ui/LiquidFilters';
import { useIsMobile } from '../shared/hooks/useIsMobile';
import { BottomSheet } from './layout/BottomSheet';
import { ChatDock } from './layout/ChatDock';
import { FilterChip } from './layout/FilterChip';
import { introDelay } from './layout/introDelay';

// Preload WorldCanvas chunk in parallel during initial paint
const worldCanvasPromise = import('../features/world/scene/WorldCanvas');
const WorldCanvas = lazy(() => worldCanvasPromise);

/** Esc closes the top-most thing: settings, then the paper focus, then the highlight filter. */
function useEscapeToDismiss() {
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
}

export function AppShell() {
  const glassLevel = useGlassLevel();
  const reduceMotion = useUi((s) => s.settings.reduceMotion);
  useLiquidLight(glassLevel >= 2 && !reduceMotion);
  const status = useWorld((s) => s.status);
  const error = useWorld((s) => s.error);
  const panelOpen = useUi((s) => s.panelPaperId !== null);
  const health = useHealth();
  const mobile = useIsMobile();
  useEscapeToDismiss();

  // Listen to the crawl stream once the world is in place (reconnects on its own).
  useEffect(() => {
    if (status !== 'ready') return;
    useCrawl.getState().startListening();
    return () => useCrawl.getState().stopListening();
  }, [status]);

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
      {glassLevel >= 2 && <LiquidFilters refract={glassLevel === 3} />}
    </div>
  );
}
