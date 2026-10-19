import { useCrawl } from '../../../store/crawlStore';
import { useUi } from '../../../store/uiStore';
import type { FlowQuality } from '../../../utils/crawlFlow';
import { RootRiseParticles } from './RootRiseParticles';

export function useFlowQuality(): FlowQuality {
  const mode = useUi((s) => s.settings.quality);
  const tier = useUi((s) => s.qualityTier);
  return mode === 'low' || (mode === 'auto' && tier >= 2) ? 'low' : 'high';
}

/**
 * Crawl-only visuals (the cables themselves are always on, see FeedCables). Mounted only while
 * crawling and for the fade-out afterwards. Low quality: no root-rise particles. Reduce motion:
 * no particles at all — blocks and tiles still react (crawlStore applies arrivals directly).
 */
export function CrawlEffects() {
  const active = useCrawl((s) => s.visualActive);
  const showRise = useCrawl((s) => s.showRise);
  const reduce = useUi((s) => s.settings.reduceMotion);
  const quality = useFlowQuality();
  if (!active) return null;
  return (
    <group name="crawl">
      {!reduce && showRise && quality === 'high' && <RootRiseParticles />}
    </group>
  );
}
