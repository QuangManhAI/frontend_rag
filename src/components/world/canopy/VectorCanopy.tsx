import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFx } from '../../../store/fxStore';
import { useRag } from '../../../store/ragStore';
import { useUi } from '../../../store/uiStore';
import { useWorld } from '../../../store/worldStore';
import { useTheme } from '../../../theme/useTheme';
import { applyStates, buildCanopyAttributes, buildCanopyColors, diffStates } from '../../../utils/canopy';
import { glowBlending, pointScale, toColor } from '../materials';
import { CANOPY_FRAG, CANOPY_VERT } from './canopyShader';

const PICK_INTERVAL_MS = 30;

/** Every paper vector as ONE THREE.Points; states/filters only touch the `state` attribute. */
export function VectorCanopy() {
  const vectors = useWorld((s) => s.vectors);
  const theme = useTheme();
  const highlights = useUi((s) => s.highlights);
  const maxYear = useUi((s) => s.maxYear);
  const reduce = useUi((s) => s.settings.reduceMotion);
  const overlay = useFx((s) => s.overlay);
  const { size, camera, gl } = useThree();
  const points = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    if (!vectors) return null;
    const a = buildCanopyAttributes(vectors, theme);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(a.position, 3));
    g.setAttribute('color', new THREE.BufferAttribute(a.color, 3));
    g.setAttribute('size', new THREE.BufferAttribute(a.size, 1));
    g.setAttribute('phase', new THREE.BufferAttribute(a.phase, 1));
    g.setAttribute('state', new THREE.BufferAttribute(a.state, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('year', new THREE.BufferAttribute(a.year, 1));
    g.computeBoundingSphere();
    return g;
    // Theme changes recolor in place below; geometry is built once per vector table.
  }, [vectors]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: CANOPY_VERT,
        fragmentShader: CANOPY_FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uScale: { value: 500 },
          uPixelRatio: { value: 1 },
          uMaxYear: { value: 9999 },
          uMinPx: { value: 1.6 },
          uMaxPx: { value: 16 },
          uTwinkle: { value: 1 },
          uGlow: { value: 1 },
          uOutlineColor: { value: new THREE.Color() },
          uOutline: { value: 0 },
        },
      }),
    [],
  );

  useEffect(() => {
    if (!geometry || !vectors) return;
    const color = geometry.getAttribute('color') as THREE.BufferAttribute;
    buildCanopyColors(vectors, theme, color.array as Float32Array);
    color.needsUpdate = true;
    material.uniforms.uGlow.value = theme.vectorGlow;
    material.uniforms.uOutline.value = theme.vectorOutlineStrength;
    material.uniforms.uOutlineColor.value.copy(toColor(theme.vectorOutline));
    material.blending = glowBlending(theme);
    material.needsUpdate = true;
  }, [theme, geometry, vectors, material]);

  useEffect(() => {
    material.uniforms.uMaxYear.value = maxYear ?? 9999;
  }, [maxYear, material]);
  useEffect(() => {
    material.uniforms.uTwinkle.value = reduce ? 0 : 1;
  }, [reduce, material]);

  // Filter + flight overlay → minimal state updates.
  useEffect(() => {
    if (!geometry) return;
    const attr = geometry.getAttribute('state') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const range = applyStates(arr, diffStates(arr, highlights, overlay));
    if (range) {
      attr.clearUpdateRanges();
      attr.addUpdateRange(range[0], range[1] - range[0] + 1);
      attr.needsUpdate = true;
    }
  }, [geometry, highlights, overlay]);

  useEffect(() => () => {
    geometry?.dispose();
  }, [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, dt) => {
    material.uniforms.uTime.value += reduce ? 0 : dt;
    material.uniforms.uScale.value = pointScale(size.height, (camera as THREE.PerspectiveCamera).fov);
    material.uniforms.uPixelRatio.value = gl.getPixelRatio();
  });

  if (!geometry) return null;
  return (
    <>
      <points ref={points} geometry={geometry} material={material} raycast={() => null} />
      <VectorPicker points={points} />
    </>
  );
}

/** Throttled manual raycast against the canopy (r3f pointer events would test all points per move). */
function VectorPicker({ points }: { points: React.RefObject<THREE.Points | null> }) {
  const { camera, gl, get } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const last = useRef(0);
  const down = useRef<[number, number] | null>(null);
  const pickMesh = useMemo(() => new THREE.Points(), []);

  useEffect(() => {
    const el = gl.domElement;
    const pick = (e: PointerEvent): number | null => {
      const p = points.current;
      const v = useWorld.getState().vectors;
      if (!p || !v) return null;
      const rect = el.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const controls = get().controls as { getTarget?: (out: THREE.Vector3) => THREE.Vector3 } | null;
      const target = controls?.getTarget ? controls.getTarget(new THREE.Vector3()) : new THREE.Vector3(0, 70, 0);
      raycaster.params.Points = { threshold: THREE.MathUtils.clamp(camera.position.distanceTo(target) * 0.0065, 0.18, 1.6) };
      pickMesh.geometry = p.geometry;
      pickMesh.matrixWorld.copy(p.matrixWorld);
      const hits = raycaster.intersectObject(pickMesh, false);
      const maxYear = useUi.getState().maxYear ?? 9999;
      let best: number | null = null;
      let bestRay = Infinity;
      for (const h of hits.slice(0, 64)) {
        const i = h.index ?? -1;
        if (i < 0 || v.years[i] > maxYear) continue;
        const d = h.distanceToRay ?? 0;
        if (d < bestRay) {
          bestRay = d;
          best = i;
        }
      }
      return best;
    };
    const onMove = (e: PointerEvent) => {
      if (e.buttons !== 0) return;
      const now = performance.now();
      if (now - last.current < PICK_INTERVAL_MS) return;
      last.current = now;
      const idx = pick(e);
      const ui = useUi.getState();
      if (idx !== null) {
        ui.setHovered(idx, { kind: 'vector', id: idx, x: e.clientX, y: e.clientY });
        el.style.cursor = 'pointer';
      } else if (ui.hoveredVectorIndex !== null) {
        ui.setHovered(null, null);
        el.style.cursor = '';
      }
    };
    const onDown = (e: PointerEvent) => (down.current = [e.clientX, e.clientY]);
    const onUp = (e: PointerEvent) => {
      const d = down.current;
      down.current = null;
      if (!d || Math.hypot(e.clientX - d[0], e.clientY - d[1]) > 5) return;
      const idx = pick(e);
      if (idx === null) return;
      const paperId = useWorld.getState().vectorIds[idx];
      const rag = useRag.getState();
      useUi.getState().focusPaper(paperId, { context: { citationChecks: rag.current.citationChecks, grounded: rag.current.grounded_chunks } });
    };
    const onLeave = () => {
      if (useUi.getState().hoveredVectorIndex !== null) useUi.getState().setHovered(null, null);
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [gl, camera, get, raycaster, ndc, points, pickMesh]);

  return null;
}
