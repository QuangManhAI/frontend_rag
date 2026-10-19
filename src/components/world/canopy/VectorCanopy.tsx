import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFx } from '../../../store/fxStore';
import { useRag } from '../../../store/ragStore';
import { useUi } from '../../../store/uiStore';
import { useWorld } from '../../../store/worldStore';
import { useTheme } from '../../../theme/useTheme';
import { buildCanopyAttributes, buildCanopyColors } from '../../../utils/canopy';
import { toUpdateRanges, updateFilterMask, updateOverlayStates } from '../../../utils/canopyUpdate';
import { buildPointGrid, pickNearest, raycastGrid, type RayHit } from '../../../utils/spatialGrid';
import { glowBlending, pointScale, toColor } from '../materials';
import { CANOPY_FRAG, CANOPY_VERT } from './canopyShader';
import { LEGACY_FX, timed } from '../../../utils/perfProbe';

const PICK_INTERVAL_MS = 30;

/**
 * Every paper vector as ONE THREE.Points. The flight overlay lives in the `state` attribute and the
 * filter in an `inFilter` mask + `uFilter` uniform; both are updated incrementally (only changed indices).
 */
export function VectorCanopy() {
  const vectors = useWorld((s) => s.vectors);
  const theme = useTheme();
  const highlights = useUi((s) => s.highlights);
  const maxYear = useUi((s) => s.maxYear);
  const reduce = useUi((s) => s.settings.reduceMotion);
  const overlay = useFx((s) => s.overlay);
  const { size, camera, gl } = useThree();

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
    g.setAttribute('inFilter', new THREE.BufferAttribute(new Uint8Array(vectors.count), 1).setUsage(THREE.DynamicDrawUsage));
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
          uFilter: { value: 0 },
          uFootprint: { value: LEGACY_FX ? 1 : 0.8 },
          uAlphaCut: { value: LEGACY_FX ? 0 : 0.012 },
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

  // Filter + flight overlay → only the changed indices are written and uploaded.
  const prev = useRef<{ highlights: Uint32Array | null; overlay: ReadonlyMap<number, number> }>({ highlights: null, overlay: new Map() });
  useEffect(() => {
    if (!geometry) return;
    timed('diffStates', () => {
      const upload = (attr: THREE.BufferAttribute, changed: number[]) => {
        if (changed.length === 0) return;
        attr.clearUpdateRanges();
        for (const [start, count] of toUpdateRanges(changed)) attr.addUpdateRange(start, count);
        attr.needsUpdate = true;
      };
      const maskAttr = geometry.getAttribute('inFilter') as THREE.BufferAttribute;
      const stateAttr = geometry.getAttribute('state') as THREE.BufferAttribute;
      if (highlights !== prev.current.highlights) upload(maskAttr, updateFilterMask(maskAttr.array as Uint8Array, prev.current.highlights, highlights));
      if (overlay !== prev.current.overlay) upload(stateAttr, updateOverlayStates(stateAttr.array as Float32Array, prev.current.overlay, overlay));
      material.uniforms.uFilter.value = highlights ? 1 : 0;
      prev.current = { highlights, overlay };
    });
  }, [geometry, highlights, overlay, material]);
  useEffect(() => {
    prev.current = { highlights: null, overlay: new Map() };
  }, [geometry]);

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
      <points geometry={geometry} material={material} raycast={() => null} />
      <VectorPicker />
    </>
  );
}

/**
 * Throttled hover/click picking. A spatial hash built once over the (world-space, untransformed)
 * canopy positions means each ray only tests points in the cells it passes near.
 */
function VectorPicker() {
  const { camera, gl, get } = useThree();
  const vectors = useWorld((s) => s.vectors);
  const grid = useMemo(() => (vectors ? buildPointGrid(vectors.positions, 3) : null), [vectors]);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const hits = useMemo<RayHit[]>(() => [], []);
  const last = useRef(0);
  const down = useRef<[number, number] | null>(null);

  useEffect(() => {
    const el = gl.domElement;
    const pick = (e: PointerEvent): number | null => {
      const v = useWorld.getState().vectors;
      if (!grid || !v) return null;
      const rect = el.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const controls = get().controls as { getTarget?: (out: THREE.Vector3) => THREE.Vector3 } | null;
      if (controls?.getTarget) controls.getTarget(target);
      else target.set(0, 70, 0);
      const threshold = THREE.MathUtils.clamp(camera.position.distanceTo(target) * 0.0065, 0.18, 1.6);
      const { origin, direction } = raycaster.ray;
      raycastGrid(grid, [origin.x, origin.y, origin.z], [direction.x, direction.y, direction.z], threshold, raycaster.near, raycaster.far, hits);
      const maxYear = useUi.getState().maxYear ?? 9999;
      return pickNearest(hits, (i) => v.years[i] <= maxYear);
    };
    const onMove = (e: PointerEvent) => {
      if (e.buttons !== 0) return;
      const now = performance.now();
      if (now - last.current < PICK_INTERVAL_MS) return;
      last.current = now;
      const idx = timed('pick', () => pick(e));
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
  }, [gl, camera, get, raycaster, ndc, grid, target, hits]);

  return null;
}
