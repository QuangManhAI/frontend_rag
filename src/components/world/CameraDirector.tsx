import { CameraControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type * as THREE from 'three';
import { flightProbe } from '../../store/fxStore';
import { useUi } from '../../store/uiStore';
import { getPreset } from '../../utils/cameraPresets';

/** Moves CameraControls to the preset of the current camera mode; users can orbit freely afterwards. */
export function CameraDirector() {
  const ref = useRef<CameraControls>(null);
  const mode = useUi((s) => s.cameraMode);
  const target = useUi((s) => s.cameraTarget);
  const reduce = useUi((s) => s.settings.reduceMotion);
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const size = useThree((s) => s.size);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const chatOpen = useUi((s) => s.chatOpen);
  const panelOpen = useUi((s) => s.panelPaperId !== null);
  const first = useRef(true);

  // Keep the scene centered in the area not covered by the side panels (desktop only).
  useEffect(() => {
    const { width: w, height: h } = size;
    if (w < 768) {
      camera.clearViewOffset();
      return;
    }
    const left = chatOpen ? Math.min(520, Math.max(340, w * 0.32)) + 12 : 0;
    const right = panelOpen ? Math.max(320, Math.min(420, w * 0.34)) + 12 : 0;
    const shift = (left - right) / 2;
    if (Math.abs(shift) < 1) camera.clearViewOffset();
    else camera.setViewOffset(w, h, -shift, 0, w, h);
    camera.updateProjectionMatrix();
  }, [camera, size, chatOpen, panelOpen]);

  useEffect(() => {
    const c = ref.current;
    if (!c || mode === 'follow') return;
    const p = getPreset(mode, { point: target, aspect });
    void c.setLookAt(...p.position, ...p.target, !reduce && !first.current);
    first.current = false;
  }, [mode, target, reduce, aspect]);

  useFrame(() => {
    const c = ref.current;
    if (!c || mode !== 'follow') return;
    const p = getPreset('follow', { point: flightProbe.active ? flightProbe.position : target, aspect });
    void c.setLookAt(...p.position, ...p.target, !reduce);
  });

  // Soft damping for scripted moves (chasing the orb, framing the result, pulling back) so the
  // camera never whips around; dragging stays responsive.
  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={2.5}
      maxDistance={520}
      smoothTime={mode === 'follow' ? 0.9 : 1.15}
      draggingSmoothTime={0.12}
      maxPolarAngle={Math.PI * 0.62}
    />
  );
}
