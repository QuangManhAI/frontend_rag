import { useCrawl } from '../../../store/crawlStore';
import { useUi } from '../../../store/uiStore';
import type { FlowQuality } from '../../../utils/crawlFlow';
import { CrawlStreams } from './CrawlStreams';
import { RootRiseParticles } from './RootRiseParticles';

export function useFlowQuality(): FlowQuality {
  const mode = useUi((s) => s.settings.quality);
  const tier = useUi((s) => s.qualityTier);
  return mode === 'low' || (mode === 'auto' && tier >= 2) ? 'low' : 'high';
}

/**
 * Live-crawl visuals. Mounted only while crawling (and for the fade-out afterwards): when idle
 * nothing is rendered, so the scene's draw calls are exactly what they were before.
 * Low quality: smaller pool and no root-rise particles. Reduce motion: no particles at all —
 * crates and tiles still react (crawlStore applies arrivals directly).
 */
export function CrawlEffects() {
  const active = useCrawl((s) => s.visualActive);
  const showRise = useCrawl((s) => s.showRise);
  const reduce = useUi((s) => s.settings.reduceMotion);
  const quality = useFlowQuality();
  if (!active) return null;
  return (
    <group name="crawl">
      {!reduce && <CrawlStreams quality={quality} />}
      {!reduce && showRise && quality === 'high' && <RootRiseParticles />}
    </group>
  );
}
