import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFx } from '../../../store/fxStore';
import { useRag } from '../../../store/ragStore';
import { useUi } from '../../../store/uiStore';
import { useWorld } from '../../../store/worldStore';
import { useTheme } from '../../../theme/useTheme';
import { buildCanopyAttributes, buildCanopyColors, fillCanopyRange } from '../../../utils/canopy';
import { nowSec } from '../../../store/crawlFx';
import { toUpdateRanges, updateFilterMask, updateOverlayStates } from '../../../utils/canopyUpdate';
import { buildPointGrid, pickNearest, raycastGrid, raycastRange, type PointGrid, type RayHit } from '../../../utils/spatialGrid';
import { glowBlending, pointScale, toColor } from '../materials';
import { withSceneIntro } from '../sceneIntro';
import { CANOPY_FRAG, CANOPY_VERT } from './canopyShader';
import { LEGACY_FX, timed } from '../../../utils/perfProbe';

const PICK_INTERVAL_MS = 30;
/** Appended papers tested brute-force before the pick grid is rebuilt. */
const TAIL_REBUILD = 6000;

/**
 * Every paper vector as ONE THREE.Points. The flight overlay lives in the `state` attribute and the
 * filter in an `inFilter` mask + `uFilter` uniform; both are updated incrementally (only changed indices).
 */
export function VectorCanopy() {
  const vectors = useWorld((s) => s.vectors);
  const version = useWorld((s) => s.vectorsVersion);
  // Buffers are rebuilt only when the table's arrays are reallocated (growth by a multiple).
  const positions = vectors?.positions ?? null;
  const theme = useTheme();
  const highlights = useUi((s) => s.highlights);
  const maxYear = useUi((s) => s.maxYear);
  const reduce = useUi((s) => s.settings.reduceMotion);
  const overlay = useFx((s) => s.overlay);
  const { size, camera, gl } = useThree();

  const geometry = useMemo(() => {
    const vectors = useWorld.getState().vectors;
    if (!vectors) return null;
    const cap = vectors.positions.length / 3;
    const a = buildCanopyAttributes(vectors, theme);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(a.position, 3));
    g.setAttribute('color', new THREE.BufferAttribute(a.color, 3));
    g.setAttribute('size', new THREE.BufferAttribute(a.size, 1));
    g.setAttribute('phase', new THREE.BufferAttribute(a.phase, 1));
    g.setAttribute('state', new THREE.BufferAttribute(a.state, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('year', new THREE.BufferAttribute(a.year, 1));
    g.setAttribute('inFilter', new THREE.BufferAttribute(new Uint8Array(cap), 1).setUsage(THREE.DynamicDrawUsage));
    const born = new Float32Array(cap);
    born.set(useWorld.getState().bornAt.subarray(0, Math.min(cap, useWorld.getState().bornAt.length)));
    g.setAttribute('born', new THREE.BufferAttribute(born, 1));
    g.setDrawRange(0, vectors.count);
    g.computeBoundingSphere();
    return g;
    // Theme changes recolor in place below; appended papers are written into spare capacity.
  }, [positions]);

  // Papers appended by the live crawl: fill only the new index range.
  const filled = useRef(0);
  useEffect(() => {
    filled.current = useWorld.getState().vectors?.count ?? 0;
  }, [geometry]);
  useEffect(() => {
    const v = useWorld.getState().vectors;
    if (!geometry || !v || v.count <= filled.current) return;
    const from = filled.current;
    const n = v.count - from;
    const attr = (name: string) => geometry.getAttribute(name) as THREE.BufferAttribute;
    buildCanopyColors(v, theme, attr('color').array as Float32Array, from);
    fillCanopyRange(v, { size: attr('size').array as Float32Array, phase: attr('phase').array as Float32Array, year: attr('year').array as Float32Array }, from);
    (attr('born').array as Float32Array).set(useWorld.getState().bornAt.subarray(from, v.count), from);
    for (const name of ['position', 'color', 'size', 'phase', 'year', 'born']) {
      const a = attr(name);
      a.clearUpdateRanges();
      a.addUpdateRange(from * a.itemSize, n * a.itemSize);
      a.needsUpdate = true;
    }
    geometry.setDrawRange(0, v.count);
    filled.current = v.count;
  }, [version, geometry]);

  const material = useMemo(
    () =>
      withSceneIntro(new THREE.ShaderMaterial({
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
          uDimRest: { value: 0 },
          uClock: { value: 0 },
          uFootprint: { value: LEGACY_FX ? 1 : 0.8 },
          uAlphaCut: { value: LEGACY_FX ? 0 : 0.08 },
        },
      })),
    [],
  );

  // Theme → recolour in place (not on every crawl append: those fill their own range).
  useEffect(() => {
    const vectors = useWorld.getState().vectors;
    if (!geometry || !vectors) return;
    const color = geometry.getAttribute('color') as THREE.BufferAttribute;
    buildCanopyColors(vectors, theme, color.array as Float32Array);
    color.clearUpdateRanges();
    color.needsUpdate = true;
    material.uniforms.uGlow.value = theme.vectorGlow;
    material.uniforms.uOutline.value = theme.vectorOutlineStrength;
    material.uniforms.uOutlineColor.value.copy(toColor(theme.vectorOutline));
    material.blending = glowBlending(theme);
    material.needsUpdate = true;
  }, [theme, geometry, material]);

  useEffect(() => {
    material.uniforms.uMaxYear.value = maxYear ?? 9999;
  }, [maxYear, material]);
  useEffect(() => {
    material.uniforms.uTwinkle.value = reduce ? 0 : 1;
  }, [reduce, material]);

  // Filter + flight overlay → only the changed indices are written and uploaded.
  const prev = useRef<{ highlights: Uint32Array | null; overlay: ReadonlyMap<number, number> }>({ highlights: null, overlay: new Map() });
  // A rebuilt geometry starts blank: forget what was written into the previous buffers (runs first).
  const prevGeometry = useRef<THREE.BufferGeometry | null>(null);
  useEffect(() => {
    if (!geometry) return;
    if (prevGeometry.current !== geometry) {
      prevGeometry.current = geometry;
      prev.current = { highlights: null, overlay: new Map() };
    }
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


  useEffect(() => () => {
    geometry?.dispose();
  }, [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, dt) => {
    material.uniforms.uTime.value += reduce ? 0 : dt;
    material.uniforms.uClock.value = nowSec();
    // Dimming fades in/out over ~1 s (instantly with reduce motion).
    const dimTarget = useFx.getState().dim;
    const u = material.uniforms.uDimRest;
    u.value = reduce ? dimTarget : u.value + (dimTarget - u.value) * Math.min(1, dt * 2.5);
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
  // Built once. Papers appended by the live crawl are tested brute-force as a short tail; the grid
  // is rebuilt only when that tail exceeds TAIL_REBUILD or the arrays were reallocated.
  const gridRef = useRef<{ grid: PointGrid; count: number; buffer: ArrayBufferLike } | null>(null);
  const gridFor = (v: NonNullable<typeof vectors>): { grid: PointGrid; count: number } => {
    const g = gridRef.current;
    if (!g || g.buffer !== v.positions.buffer || v.count - g.count > TAIL_REBUILD) {
      gridRef.current = { grid: buildPointGrid(v.positions.subarray(0, v.count * 3), 3), count: v.count, buffer: v.positions.buffer };
    }
    return gridRef.current as { grid: PointGrid; count: number };
  };
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
      if (!v) return null;
      const { grid, count: gridCount } = gridFor(v);
      const rect = el.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const controls = get().controls as { getTarget?: (out: THREE.Vector3) => THREE.Vector3 } | null;
      if (controls?.getTarget) controls.getTarget(target);
      else target.set(0, 70, 0);
      const threshold = THREE.MathUtils.clamp(camera.position.distanceTo(target) * 0.0065, 0.18, 1.6);
      const { origin, direction } = raycaster.ray;
      const o = [origin.x, origin.y, origin.z] as const;
      const d = [direction.x, direction.y, direction.z] as const;
      raycastGrid(grid, o, d, threshold, raycaster.near, raycaster.far, hits);
      if (v.count > gridCount) raycastRange(v.positions, gridCount, v.count, o, d, threshold, raycaster.near, raycaster.far, hits);
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
  }, [gl, camera, get, raycaster, ndc, target, hits]); // gridFor reads refs only

  return null;
}
