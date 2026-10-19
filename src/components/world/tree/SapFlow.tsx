import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mulberry32 } from '../../../api/mock/rng';
import { useUi } from '../../../store/uiStore';
import { useWorld } from '../../../store/worldStore';
import type { Vec3 } from '../../../types/world';
import { categoryColor } from '../../../theme/tokens';
import { useTheme } from '../../../theme/useTheme';
import { hexToRgb } from '../../../utils/canopy';
import { resamplePolyline } from '../../../utils/flight';
import { buildSapParticles } from '../../../utils/treeGeometry';
import { glowBlending, pointScale, SOFT_POINT_FRAG, toColor } from '../materials';

const SAMPLES = 48;
const PER_PATH = 5;

const VERT = /* glsl */ `
  attribute float aPath;
  attribute float aPhase;
  attribute float aSpeed;
  attribute vec3 aColor;
  uniform sampler2D uPaths;
  uniform float uSamples;
  uniform float uPathCount;
  uniform float uTime;
  uniform float uScale;
  uniform float uPixelRatio;
  uniform vec3 uSapColor;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float t = fract(uTime * aSpeed + aPhase);
    float f = t * (uSamples - 1.0);
    float i0 = floor(f);
    float v = (aPath + 0.5) / uPathCount;
    vec3 a = texture2D(uPaths, vec2((i0 + 0.5) / uSamples, v)).xyz;
    vec3 b = texture2D(uPaths, vec2((min(i0 + 1.0, uSamples - 1.0) + 0.5) / uSamples, v)).xyz;
    vec4 mv = modelViewMatrix * vec4(mix(a, b, f - i0), 1.0);
    gl_PointSize = clamp(0.75 * uScale / -mv.z, 1.5, 9.0) * uPixelRatio;
    gl_Position = projectionMatrix * mv;
    vColor = mix(aColor, uSapColor, smoothstep(0.12, 0.4, t));
    vAlpha = smoothstep(0.0, 0.04, t) * (1.0 - smoothstep(0.9, 1.0, t));
  }
`;

/** Sap particles: crate → root → trunk → branch → twig of the same category. One draw call. */
export function SapFlow() {
  const ground = useWorld((s) => s.ground);
  const tree = useWorld((s) => s.tree);
  const nodesById = useWorld((s) => s.nodesById);
  const theme = useTheme();
  const reduce = useUi((s) => s.settings.reduceMotion);
  const { size, camera, gl } = useThree();

  const built = useMemo(() => {
    if (!ground || tree.length === 0) return null;
    const rng = mulberry32(11);
    const twigs = tree.filter((n) => n.depth === 2);
    const byCat = new Map<number, typeof twigs>();
    twigs.forEach((t) => byCat.set(t.dominant_category, [...(byCat.get(t.dominant_category) ?? []), t]));
    const trunk: Vec3[] = [[0, 0, 0], [0, 12, 0], [0, 24, 0], [0, 35, 0]];
    const crateCat = new Map(ground.crates.map((c) => [c.id, c.category_index]));
    const paths: Vec3[][] = [];
    const cats: number[] = [];
    for (const r of ground.roots) {
      const cat = crateCat.get(r.crate_id) ?? -1;
      const pool = byCat.get(cat) ?? twigs;
      const twig = pool[Math.floor(rng() * pool.length)];
      const branch = twig ? nodesById.get(twig.parent_id ?? -1) : undefined;
      if (!twig || !branch) continue;
      paths.push(resamplePolyline([...r.path, ...trunk.slice(1), ...branch.path.slice(1), ...twig.path.slice(1)], SAMPLES));
      cats.push(cat);
    }
    const data = new Float32Array(SAMPLES * paths.length * 4);
    paths.forEach((p, row) => p.forEach((pt, i) => data.set([pt[0], pt[1], pt[2], 1], (row * SAMPLES + i) * 4)));
    const tex = new THREE.DataTexture(data, SAMPLES, Math.max(1, paths.length), THREE.RGBAFormat, THREE.FloatType);
    tex.magFilter = tex.minFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    const sap = buildSapParticles(paths, PER_PATH, rng);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sap.count * 3), 3));
    g.setAttribute('aPath', new THREE.BufferAttribute(sap.pathIndex, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(sap.phase, 1));
    g.setAttribute('aSpeed', new THREE.BufferAttribute(sap.speed, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(sap.count * 3), 3));
    return { geometry: g, tex, cats, pathCount: paths.length };
  }, [ground, tree, nodesById]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: SOFT_POINT_FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uPaths: { value: null },
          uSamples: { value: SAMPLES },
          uPathCount: { value: 1 },
          uTime: { value: 0 },
          uScale: { value: 500 },
          uPixelRatio: { value: 1 },
          uSapColor: { value: new THREE.Color() },
        },
      }),
    [],
  );

  useEffect(() => {
    if (!built) return;
    material.uniforms.uPaths.value = built.tex;
    material.uniforms.uPathCount.value = Math.max(1, built.pathCount);
  }, [built, material]);

  useEffect(() => {
    if (!built) return;
    const attr = built.geometry.getAttribute('aColor') as THREE.BufferAttribute;
    for (let i = 0; i < attr.count; i++) {
      const [r, g, b] = hexToRgb(categoryColor(built.cats[Math.floor(i / PER_PATH)], theme));
      attr.setXYZ(i, r, g, b);
    }
    attr.needsUpdate = true;
    material.uniforms.uSapColor.value.copy(toColor(theme.sap)).multiplyScalar(theme.additiveGlow ? 1.5 : 1);
    material.blending = glowBlending(theme);
    material.needsUpdate = true;
  }, [theme, built, material]);

  useEffect(() => () => {
    built?.geometry.dispose();
    built?.tex.dispose();
  }, [built]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, dt) => {
    if (!reduce) material.uniforms.uTime.value += dt;
    material.uniforms.uScale.value = pointScale(size.height, (camera as THREE.PerspectiveCamera).fov);
    material.uniforms.uPixelRatio.value = gl.getPixelRatio();
  });

  if (!built) return null;
  return <points geometry={built.geometry} material={material} frustumCulled={false} raycast={() => null} />;
}
