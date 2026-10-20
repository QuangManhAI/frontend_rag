import { Canvas } from '@react-three/fiber';
import { lazy, Suspense } from 'react';
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
import { SkyBackground } from './SkyBackground';
import { AncientTree } from './tree/AncientTree';
import { getPreset } from '../../utils/cameraPresets';
import { PERF_ENABLED } from '../../utils/perfProbe';

const params = new URLSearchParams(globalThis.location?.search ?? '');
const SHOW_PERF = import.meta.env.DEV && params.has('perf');
/** `?nofx` disables bloom (useful for software-GL test runs). */
const NO_FX = params.has('nofx');

const Perf = SHOW_PERF ? lazy(() => import('r3f-perf').then((m) => ({ default: m.Perf }))) : null;

const start = getPreset('overview');

/** The one and only canvas: ground, tree, canopy and fx groups. */
export default function WorldCanvas() {
  return (
    <Canvas
      dpr={[1, 1.15]}
      camera={{ fov: 45, near: 0.5, far: 3000, position: [...start.position] }}
      // Canvas MSAA is wasted under the composer (it renders off-screen). Opaque: the sky covers everything.
      gl={{ antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance', toneMapping: THREE.NoToneMapping }}
      performance={{ min: 0.6, debounce: 250 }}
      onPointerMissed={() => undefined}
      data-testid="world-canvas"
      onCreated={({ gl, scene, camera }) => {
        gl.debug.checkShaderErrors = false;
        if (PERF_ENABLED) Object.assign(globalThis, { __rktGl: gl });
      }}
    >
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
      {Perf && (
        <Suspense fallback={null}>
          <Perf position="bottom-right" />
        </Suspense>
      )}
    </Canvas>
  );
}
