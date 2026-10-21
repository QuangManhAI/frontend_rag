import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '../../../theme/useTheme';
import type { Vec3 } from '../../../types/world';
import { toColor } from '../materials';
import { compareLabel } from '../overlay/CompareScoreLabel';

export interface CompareThreadsHandle {
  /** Thread from the orb to the vector being compared, with its real score. */
  show: (from: Vec3, to: Vec3, score: number) => void;
  /** Keep the thread attached while the orb moves. */
  follow: (from: Vec3) => void;
  hide: () => void;
}

const TRACE = 12;

/** Current compare thread (+ its score label in the DOM overlay) and faint traces of recent comparisons. */
export const CompareThreads = forwardRef<CompareThreadsHandle>(function CompareThreads(_, ref) {
  const theme = useTheme();
  const target = useRef<Vec3 | null>(null);
  const traceHead = useRef(0);

  const { line, trace } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const line = new THREE.Line(g, new THREE.LineBasicMaterial({ transparent: true, opacity: 0.95, toneMapped: false, depthWrite: false }));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 60, 0), 120);
    line.visible = false;
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRACE * 6), 3));
    tg.setDrawRange(0, 0);
    const trace = new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ transparent: true, opacity: 0.28, toneMapped: false, depthWrite: false }));
    tg.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 60, 0), 120);
    return { line, trace };
  }, []);

  useEffect(() => {
    const c = toColor(theme.thread).multiplyScalar(theme.additiveGlow ? 2.2 : 1);
    (line.material as THREE.LineBasicMaterial).color.copy(c);
    (trace.material as THREE.LineBasicMaterial).color.copy(c);
  }, [theme, line, trace]);
  useEffect(() => () => {
    line.geometry.dispose();
    (line.material as THREE.Material).dispose();
    trace.geometry.dispose();
    (trace.material as THREE.Material).dispose();
  }, [line, trace]);

  useImperativeHandle(
    ref,
    () => ({
      show: (from, to, score) => {
        target.current = to;
        const pos = line.geometry.getAttribute('position') as THREE.BufferAttribute;
        pos.setXYZ(0, from[0], from[1], from[2]);
        pos.setXYZ(1, to[0], to[1], to[2]);
        pos.needsUpdate = true;
        line.visible = true;
        // Remember this comparison as a faint trace segment.
        const tp = trace.geometry.getAttribute('position') as THREE.BufferAttribute;
        const k = traceHead.current % TRACE;
        tp.setXYZ(k * 2, from[0], from[1], from[2]);
        tp.setXYZ(k * 2 + 1, to[0], to[1], to[2]);
        tp.needsUpdate = true;
        traceHead.current++;
        trace.geometry.setDrawRange(0, Math.min(TRACE, traceHead.current) * 2);
        compareLabel.show(to, score.toFixed(3));
      },
      follow: (from) => {
        if (!line.visible || !target.current) return;
        const pos = line.geometry.getAttribute('position') as THREE.BufferAttribute;
        pos.setXYZ(0, from[0], from[1], from[2]);
        pos.needsUpdate = true;
      },
      hide: () => {
        line.visible = false;
        target.current = null;
        traceHead.current = 0;
        trace.geometry.setDrawRange(0, 0);
        compareLabel.hide();
      },
    }),
    [line, trace],
  );

  return (
    <>
      <primitive object={line} />
      <primitive object={trace} />
    </>
  );
});
