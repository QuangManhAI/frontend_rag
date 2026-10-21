import { Canvas, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import { CameraDirector } from './CameraDirector';
import { VectorCanopy } from './canopy/VectorCanopy';
import { Fireflies } from './fx/Fireflies';
import { CrawlEffects } from './fx/CrawlEffects';
import { QueryFlight } from './fx/QueryFlight';
import { KnowledgeBlocks } from './ground/KnowledgeBlocks';
import { FeedCables } from './fx/FeedCables';
import { GroundGrid } from './ground/GroundGrid';
import { Lighting } from './Lighting';
import { PostFX } from './PostFX';
import { AdaptiveQuality } from './AdaptiveQuality';
import { AnchorProjector } from './overlay/anchors';
import { PerfSampler, PerfHUD } from './overlay/PerfHUD';
import { SkyBackground } from './SkyBackground';
import { AncientTree } from './tree/AncientTree';
import { getPreset } from '../../utils/cameraPresets';
import { PERF_ENABLED } from '../../utils/perfProbe';

const params = new URLSearchParams(globalThis.location?.search ?? '');
const SHOW_PERF = import.meta.env.DEV || params.has('perf') || params.has('bench');
/** `?nofx` disables bloom (useful for software-GL test runs). */
const NO_FX = params.has('nofx');

function parseFpsLock(): number {
  const raw = params.get('fps') ?? import.meta.env.FPS_LOCK ?? import.meta.env.VITE_FPS_LOCK ?? '';
  const n = Number(String(raw).trim());
  return Number.isFinite(n) && n > 0 ? Math.min(240, Math.max(10, Math.round(n))) : 0;
}

export const FPS_LOCK = parseFpsLock();

const start = getPreset('overview');

/** Drift-compensated frame pacer when `FPS_LOCK` is configured in `.env`. */
function FpsLimiter({ targetFps }: { targetFps: number }) {
  const advance = useThree((s) => s.advance);

  useEffect(() => {
    if (targetFps <= 0) return;
    const intervalMs = 1000 / targetFps;
    const toleranceMs = Math.min(1.5, intervalMs * 0.12);
    let rafId = 0;
    let nextFrameTime = performance.now();

    const loop = (now: number) => {
      rafId = requestAnimationFrame(loop);
      if (now >= nextFrameTime - toleranceMs) {
        if (now - nextFrameTime > intervalMs * 2) {
          nextFrameTime = now + intervalMs;
        } else {
          nextFrameTime += intervalMs;
        }
        advance(now);
      }
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [targetFps, advance]);

  return null;
}

/** The one and only canvas: ground, tree, canopy and fx groups. */
export default function WorldCanvas() {
  const locked = FPS_LOCK > 0;
  return (
    <>
      <Canvas
        frameloop={locked ? 'never' : 'always'}
        dpr={[1, 1.15]}
        camera={{ fov: 45, near: 0.5, far: 3000, position: [...start.position] }}
        // Canvas MSAA is wasted under the composer (it renders off-screen). Opaque: the sky covers everything.
        gl={{ antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance', toneMapping: THREE.NoToneMapping }}
        performance={{ min: 0.6, debounce: 250 }}
        onPointerMissed={() => undefined}
        data-testid="world-canvas"
        onCreated={({ gl }) => {
          gl.debug.checkShaderErrors = false;
          if (PERF_ENABLED) Object.assign(globalThis, { __rktGl: gl });
        }}
      >
        {locked && <FpsLimiter targetFps={FPS_LOCK} />}
        <SkyBackground />
        <Lighting />
        <group name="ground">
          <GroundGrid />
          <KnowledgeBlocks />
          <FeedCables />
        </group>
        <group name="tree">
          <AncientTree />
        </group>
        <group name="canopy">
          <VectorCanopy />
        </group>
        <group name="fx">
          <Fireflies />
          <QueryFlight />
          <CrawlEffects />
        </group>
        <CameraDirector />
        <AnchorProjector />
        <AdaptiveQuality />
        {!NO_FX && <PostFX />}
        {SHOW_PERF && <PerfSampler />}
      </Canvas>
      {SHOW_PERF && <PerfHUD fpsLock={FPS_LOCK} />}
    </>
  );
}
