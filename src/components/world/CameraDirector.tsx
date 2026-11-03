import { CameraControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type * as THREE from 'three';
import { flightProbe } from '../../store/fxStore';
import { useUi } from '../../store/uiStore';
import { CHAT_SLIDE_DELAY_S, CHAT_SLIDE_S } from '../../utils/animationConfig';
import { getPreset } from '../../utils/cameraPresets';

const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

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
  const clock = useThree((s) => s.clock);
  const first = useRef(true);
  // Horizontal view offset (px) easing `from` → `to`, starting at clock time `start`.
  // Starts at 0 so the scene also slides over when the chat opens on page load.
  const shift = useRef({ from: 0, to: 0, value: 0, start: 0, duration: CHAT_SLIDE_S });
  const prevPanels = useRef({ chatOpen: false, panelOpen: false });

  // Keep the scene centered in the area not covered by the side panels (desktop only).
  useEffect(() => {
    const w = size.width;
    const left = chatOpen ? Math.min(520, Math.max(340, w * 0.32)) + 12 : 0;
    const right = panelOpen ? Math.max(320, Math.min(420, w * 0.34)) + 12 : 0;
    const to = w < 768 ? 0 : (left - right) / 2;
    const prev = prevPanels.current;
    const chatToggled = prev.chatOpen !== chatOpen;
    const panelToggled = prev.panelOpen !== panelOpen;
    prevPanels.current = { chatOpen, panelOpen };
    const s = shift.current;
    if (reduce || (!chatToggled && !panelToggled)) {
      // Resize (or reduced motion): snap.
      Object.assign(s, { from: to, to, value: to });
      return;
    }
    // The chat slides slowly and the scene trails it; the paper panel pops in, so follow quickly.
    Object.assign(s, {
      from: s.value,
      to,
      start: clock.elapsedTime + (chatToggled ? CHAT_SLIDE_DELAY_S : 0),
      duration: chatToggled ? CHAT_SLIDE_S : 0.5,
    });
  }, [size.width, chatOpen, panelOpen, reduce, clock]);

  // Apply the (eased) offset; also re-applied on resize since the view spans the full canvas.
  const applied = useRef({ value: NaN, w: 0, h: 0 });
  useFrame(() => {
    const s = shift.current;
    if (s.value !== s.to) {
      const k = Math.min(1, Math.max(0, (clock.elapsedTime - s.start) / s.duration));
      s.value = k >= 1 ? s.to : s.from + (s.to - s.from) * easeInOutCubic(k);
    }
    const { width: w, height: h } = size;
    const a = applied.current;
    if (a.value === s.value && a.w === w && a.h === h) return;
    Object.assign(a, { value: s.value, w, h });
    if (Math.abs(s.value) < 0.5) camera.clearViewOffset();
    else camera.setViewOffset(w, h, -s.value, 0, w, h);
    camera.updateProjectionMatrix();
  });

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
