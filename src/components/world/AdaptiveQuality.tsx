import { PerformanceMonitor } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { useUi, type QualityTier } from '../../store/uiStore';

const FIXED_TIER: Record<'high' | 'low', QualityTier> = { high: 0, low: 2 };

/**
 * Device pixel ratio per tier: full (≤ 2) on tiers 0–1 (tier 1 only drops MSAA), then 1.5 → 1.
 * Sharpness comes first: dpr is never lowered while the camera moves.
 */
export function tierDpr(tier: QualityTier, deviceDpr: number): number {
  const maxDpr = tier === 0 ? 1.15 : 1.0;
  return Math.min(maxDpr, deviceDpr);
}

/** Ignore the first seconds (world build, shader compiles) before judging FPS. */
const WARMUP_MS = 2500;

/**
 * Quality ladder. "Tự động": after a warm-up, PerformanceMonitor steps the tier down when FPS stays low
 * (no MSAA → dpr 1.5 + cheap bloom → dpr 1, no bloom) and back up when it recovers; after
 * repeated flip-flops it settles on tier 2. "Cao"/"Thấp" pin a tier.
 */
export function AdaptiveQuality() {
  const mode = useUi((s) => s.settings.quality);
  const tier = useUi((s) => s.qualityTier);
  const set = useThree((s) => s.set);
  const setDpr = useThree((s) => s.setDpr);

  useEffect(() => {
    useUi.getState().setQualityTier(mode === 'auto' ? 0 : FIXED_TIER[mode]);
  }, [mode]);

  useEffect(() => {
    const dpr = tierDpr(tier, globalThis.devicePixelRatio || 1);
    set((s) => ({ viewport: { ...s.viewport, initialDpr: dpr } }));
    setDpr(dpr);
  }, [tier, set, setDpr]);

  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setArmed(true), WARMUP_MS);
    return () => clearTimeout(t);
  }, []);

  const step = (delta: 1 | -1) => {
    const t = useUi.getState().qualityTier;
    useUi.getState().setQualityTier(Math.min(3, Math.max(0, t + delta)) as QualityTier);
  };

  return (
    <>
      {mode === 'auto' && armed && (
        <PerformanceMonitor
          // Only step down below ~30 FPS (60 Hz) / ~45 FPS (120 Hz); step back up above 55 / 90.
          bounds={(refresh) => (refresh > 100 ? [75, 115] : [40, 58])}
          flipflops={4}
          onDecline={() => step(1)}
          onIncline={() => step(-1)}
          onFallback={() => useUi.getState().setQualityTier(2)}
        />
      )}
    </>
  );
}
