import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFx } from '../../../store/fxStore';
import { useRag } from '../../../store/ragStore';
import { useWorld } from '../../../store/worldStore';
import { useTheme } from '../../../theme/useTheme';
import { vectorPosition } from '../../../utils/flight';
import { toColor } from '../materials';

/**
 * Threads from the resting orb to each top-k vector.
 * Batched into a single LineSegments draw call with vertex colors for maximum performance.
 */
export function TopKThreads() {
  const topK = useFx((s) => s.topK);
  const anchor = useFx((s) => s.anchor);
  const vectors = useWorld((s) => s.vectors);
  const visual = useRag((s) => s.visualPhase);
  const checks = useRag((s) => s.current.citationChecks);
  const theme = useTheme();

  const isVisible = Boolean(
    anchor &&
    vectors &&
    topK.length > 0 &&
    (visual === 'found' || visual === 'generating' || visual === 'done')
  );

  const { geometry, material } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const m = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    return { geometry: g, material: m };
  }, []);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useEffect(() => {
    if (!isVisible || !anchor || !vectors) {
      geometry.setDrawRange(0, 0);
      return;
    }

    const cited = new Set(checks.filter((c) => c.status === 'verified').map((c) => c.paper_id));
    const count = topK.length;
    const positions = new Float32Array(count * 6);
    const colors = new Float32Array(count * 6);

    const baseColor = toColor(theme.thread);
    const activeMultiplier = theme.additiveGlow ? 1.5 : 1.0;

    topK.forEach((t, i) => {
      const targetPos = vectorPosition(vectors, t.index);
      const isFaded = visual === 'done' && !cited.has(t.paper_id);
      const mult = (isFaded ? 0.2 : 0.95) * activeMultiplier;

      const r = baseColor.r * mult;
      const g = baseColor.g * mult;
      const b = baseColor.b * mult;

      // Vertex 0: Anchor
      const pIdx = i * 6;
      positions[pIdx] = anchor[0];
      positions[pIdx + 1] = anchor[1];
      positions[pIdx + 2] = anchor[2];
      colors[pIdx] = r;
      colors[pIdx + 1] = g;
      colors[pIdx + 2] = b;

      // Vertex 1: Target vector
      positions[pIdx + 3] = targetPos[0];
      positions[pIdx + 4] = targetPos[1];
      positions[pIdx + 5] = targetPos[2];
      colors[pIdx + 3] = r;
      colors[pIdx + 4] = g;
      colors[pIdx + 5] = b;
    });

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setDrawRange(0, count * 2);
    geometry.computeBoundingSphere();
  }, [isVisible, anchor, vectors, topK, visual, checks, theme, geometry]);

  if (!isVisible) return null;

  return <lineSegments geometry={geometry} material={material} frustumCulled={true} />;
}
