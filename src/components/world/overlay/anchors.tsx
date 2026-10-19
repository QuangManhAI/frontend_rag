import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import type { Vec3 } from '../../../types/world';

/**
 * 3D-anchored HTML without one React root per label (drei <Html> races on unmount under React 19).
 * DOM components register an element + world position; one projector inside the Canvas moves
 * every registered element each frame by writing style.transform directly.
 */
export interface AnchorItem {
  el: HTMLElement;
  pos: THREE.Vector3;
  visible: boolean;
  /** Scale ≈ distanceFactor / distance (clamped), so cards shrink when far away. */
  distanceFactor?: number;
}

export const anchors = new Set<AnchorItem>();
/** Last camera seen by the projector, for DOM-side LOD decisions. */
export const overlayCamera: { current: THREE.Camera | null } = { current: null };

const v = new THREE.Vector3();

export function projectAnchors(camera: THREE.Camera, width: number, height: number): void {
  for (const a of anchors) {
    if (!a.visible) {
      a.el.style.visibility = 'hidden';
      continue;
    }
    v.copy(a.pos).project(camera);
    if (v.z > 1 || v.z < -1 || Math.abs(v.x) > 1.2 || Math.abs(v.y) > 1.2) {
      a.el.style.visibility = 'hidden';
      continue;
    }
    const x = (v.x * 0.5 + 0.5) * width;
    const y = (-v.y * 0.5 + 0.5) * height;
    let scale = 1;
    if (a.distanceFactor) scale = THREE.MathUtils.clamp(a.distanceFactor / camera.position.distanceTo(a.pos), 0.45, 1.1);
    a.el.style.visibility = 'visible';
    a.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
    a.el.style.zIndex = String(Math.round((1 - v.z) * 10000));
  }
}

/** Lives inside the Canvas. */
export function AnchorProjector() {
  useFrame(({ camera, size }) => {
    overlayCamera.current = camera;
    projectAnchors(camera, size.width, size.height);
  });
  return null;
}

interface AnchorProps {
  position: Vec3;
  children: ReactNode;
  distanceFactor?: number;
  visible?: boolean;
}

/** DOM element pinned to a world position (render it inside <WorldOverlay>). */
export function Anchor({ position, children, distanceFactor, visible = true }: AnchorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const item = useRef<AnchorItem | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const it: AnchorItem = { el, pos: new THREE.Vector3(), visible: true };
    item.current = it;
    anchors.add(it);
    return () => {
      anchors.delete(it);
    };
  }, []);
  useLayoutEffect(() => {
    const it = item.current;
    if (!it) return;
    it.pos.set(position[0], position[1], position[2]);
    it.distanceFactor = distanceFactor;
    it.visible = visible;
  }, [position, distanceFactor, visible]);
  return (
    <div ref={ref} className="absolute left-0 top-0" style={{ transformOrigin: '0 0', visibility: 'hidden', willChange: 'transform' }}>
      {children}
    </div>
  );
}

/** Imperatively driven anchor (the compare score label moves every comparison). */
export function createManualAnchor(): { item: AnchorItem | null; show: (p: Vec3, text: string) => void; hide: () => void } {
  const handle = {
    item: null as AnchorItem | null,
    show(p: Vec3, text: string) {
      const it = handle.item;
      if (!it) return;
      it.pos.set(p[0], p[1], p[2]);
      it.visible = true;
      const label = it.el.firstElementChild;
      if (label instanceof HTMLElement) {
        label.textContent = text;
        label.classList.remove('flash');
        void label.offsetWidth;
        label.classList.add('flash');
      }
    },
    hide() {
      if (handle.item) handle.item.visible = false;
    },
  };
  return handle;
}
