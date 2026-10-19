import { Canvas } from '@react-three/fiber';
import { lazy, Suspense } from 'react';
import * as THREE from 'three';
import { CameraDirector } from './CameraDirector';
import { VectorCanopy } from './canopy/VectorCanopy';
import { Fireflies } from './fx/Fireflies';
import { QueryFlight } from './fx/QueryFlight';
import { BookCrates } from './ground/BookCrates';
import { GroundGrid } from './ground/GroundGrid';
import { Lighting } from './Lighting';
import { PostFX } from './PostFX';
import { AnchorProjector } from './overlay/anchors';
import { SkyBackground } from './SkyBackground';
import { AncientTree } from './tree/AncientTree';
import { getPreset } from '../../utils/cameraPresets';

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
      dpr={[1, 2]}
      camera={{ fov: 45, near: 0.5, far: 3000, position: [...start.position] }}
      gl={{ antialias: !NO_FX, powerPreference: 'high-performance', toneMapping: THREE.NoToneMapping }}
      onPointerMissed={() => undefined}
      data-testid="world-canvas"
    >
      <SkyBackground />
      <Lighting />
      <group name="ground">
        <GroundGrid />
        <BookCrates />
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
      </group>
      <CameraDirector />
      <AnchorProjector />
      {!NO_FX && <PostFX />}
      {Perf && (
        <Suspense fallback={null}>
          <Perf position="bottom-right" />
        </Suspense>
      )}
    </Canvas>
  );
}
