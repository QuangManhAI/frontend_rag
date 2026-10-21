import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useFx } from '../../../store/fxStore';
import { useUi } from '../../../store/uiStore';
import { useWorld } from '../../../store/worldStore';
import { categoryColor } from '../../../theme/tokens';
import { useTheme } from '../../../theme/useTheme';
import { hexToRgb } from '../../../utils/canopy';
import { tubeAlongPath } from '../../../utils/treeGeometry';
import { toColor } from '../materials';
import { introBrightness, sceneIntro } from '../sceneIntro';
import { buildTrunk, TRUNK_TOP_RADIUS } from './Trunk';

/**
 * Trunk + every branch/twig in ONE mesh. Glowing sap veins and router highlights are done in
 * the shader: each vertex carries `branchId`, looked up in a tiny DataTexture of marks.
 */
export function Branches() {
  const tree = useWorld((s) => s.tree);
  const nodesById = useWorld((s) => s.nodesById);
  const theme = useTheme();
  const marks = useFx((s) => s.branchMarks);
  const reduce = useUi((s) => s.settings.reduceMotion);

  const maxId = useMemo(() => tree.reduce((m, n) => Math.max(m, n.id), 0), [tree]);
  const markTex = useMemo(() => {
    const tex = new THREE.DataTexture(new Uint8Array((maxId + 1) * 4), maxId + 1, 1, THREE.RGBAFormat);
    tex.magFilter = tex.minFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    return tex;
  }, [maxId]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMarks: { value: markTex },
      uMarkCount: { value: maxId + 1 },
      uVeinColor: { value: new THREE.Color() },
      uVeinIntensity: { value: 1 },
      uSelfGlow: { value: 0.2 },
      uChosenColor: { value: new THREE.Color() },
      uIntro: sceneIntro,
    }),
    [markTex, maxId],
  );

  const { geometry, ranges } = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [buildTrunk()];
    const ranges: { start: number; count: number; depth: number; category: number }[] = [{ start: 0, count: parts[0].attributes.position.count, depth: 0, category: -1 }];
    let start = ranges[0].count;
    for (const n of tree) {
      if (n.depth === 0 || n.path.length < 2) continue;
      const parentR = n.depth === 1 ? TRUNK_TOP_RADIUS * 0.85 : (nodesById.get(n.parent_id ?? -1)?.radius ?? 1) * 0.8;
      const g = tubeAlongPath(n.path, {
        radius: (t) => parentR + (n.radius - parentR) * Math.pow(t, 0.7),
        tubularSegments: n.depth === 1 ? 22 : 12,
        radialSegments: n.depth === 1 ? 10 : 6,
        branchId: n.id,
      });
      parts.push(g);
      const count = g.attributes.position.count;
      ranges.push({ start, count, depth: n.depth, category: n.dominant_category });
      start += count;
    }
    const merged = mergeGeometries(parts, false);
    parts.forEach((p) => p.dispose());
    merged.computeBoundingSphere();
    return { geometry: merged, ranges };
  }, [tree, nodesById]);

  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.02 });
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          attribute float branchId;
          uniform sampler2D uMarks;
          uniform float uMarkCount;
          varying float vMark;
          varying vec2 vBarkUv;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          vMark = floor(texture2D(uMarks, vec2((branchId + 0.5) / uMarkCount, 0.5)).r * 255.0 + 0.5);
          vBarkUv = uv;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform float uTime;
          uniform vec3 uVeinColor;
          uniform float uVeinIntensity;
          uniform float uSelfGlow;
          uniform vec3 uChosenColor;
          uniform float uIntro;
          varying float vMark;
          varying vec2 vBarkUv;`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          float rejected = step(1.5, vMark);
          diffuseColor.rgb *= 1.0 - rejected * 0.6;`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          float chosen = step(0.5, vMark) * (1.0 - step(1.5, vMark));
          float wob = sin(vBarkUv.y * 17.0 + vBarkUv.x * 9.0) * 0.08;
          float vein = pow(abs(sin((vBarkUv.x + wob) * 6.2831 * 4.0)), 36.0);
          float flow = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(vBarkUv.y * 34.0 - uTime * 2.6), 2.0);
          totalEmissiveRadiance += uVeinColor * uVeinIntensity * vein * flow * (1.0 + chosen * 1.2) * (1.0 - rejected * 0.85);
          totalEmissiveRadiance += vColor.rgb * uSelfGlow * (1.0 - rejected * 0.8);
          totalEmissiveRadiance += uChosenColor * chosen * (0.3 + 0.15 * sin(uTime * 5.0));
          totalEmissiveRadiance *= uIntro;`,
        );
    };
    m.customProgramCacheKey = () => 'ancient-tree';
    return m;
  }, [uniforms]);

  // Theme → vertex colors (trunk tint blended with the twig's dominant category) + uniforms.
  useEffect(() => {
    const color = geometry.getAttribute('color') as THREE.BufferAttribute;
    const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
    const trunk = hexToRgb(theme.trunk);
    for (const r of ranges) {
      const cat = r.category >= 0 ? hexToRgb(categoryColor(r.category, theme)) : trunk;
      for (let v = r.start; v < r.start + r.count; v++) {
        const t = uv.getY(v);
        const k = r.depth === 0 ? 0 : r.depth === 1 ? 0.18 + 0.25 * t : 0.4 + 0.4 * t;
        color.setXYZ(v, trunk[0] + (cat[0] - trunk[0]) * k, trunk[1] + (cat[1] - trunk[1]) * k, trunk[2] + (cat[2] - trunk[2]) * k);
      }
    }
    color.needsUpdate = true;
    uniforms.uVeinColor.value.copy(toColor(theme.trunkVein));
    uniforms.uVeinIntensity.value = theme.veinIntensity;
    uniforms.uSelfGlow.value = theme.additiveGlow ? 0.22 : 0.04;
    uniforms.uChosenColor.value.copy(toColor(theme.thread)).multiplyScalar(theme.additiveGlow ? 0.8 : 0.5);
  }, [theme, geometry, ranges, uniforms]);

  // Router highlight → only the mark texture changes.
  useEffect(() => {
    const data = markTex.image.data as Uint8Array;
    data.fill(0);
    for (const [id, mark] of marks) if (id <= maxId) data[id * 4] = mark;
    markTex.needsUpdate = true;
  }, [marks, markTex, maxId]);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
    markTex.dispose();
  }, [geometry, material, markTex]);

  useFrame((_, dt) => {
    if (!reduce) uniforms.uTime.value += dt;
    // Intro: dark silhouette → full color (the glow above is scaled by uIntro in the shader).
    if (material.color.r !== 1 || sceneIntro.value < 1) material.color.setScalar(introBrightness(sceneIntro.value));
  });

  return <mesh geometry={geometry} material={material} raycast={() => null} />;
}
