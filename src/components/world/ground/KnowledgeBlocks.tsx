import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { crawlFx, nowSec } from '../../../store/crawlFx';
import { useUi } from '../../../store/uiStore';
import { useWorld } from '../../../store/worldStore';
import { categoryColor } from '../../../theme/tokens';
import { useTheme } from '../../../theme/useTheme';
import { BLOCK_TOP_Y, buildBlocks, MAX_ZONES, zoneHeights, zonesOf } from '../../../utils/feedCables';
import { toColor } from '../materials';

/** Seconds for the light to rise from the bottom to the top of a block when a pulse lands. */
const RISE_S = 0.6;

const VERT = /* glsl */ `
  attribute float aZone;
  attribute float aFace;
  uniform float uTop;
  uniform float uHeight[${MAX_ZONES}];
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vW;
  varying float vDepth;
  varying float vZone;
  varying float vFace;
  void main() {
    int z = int(aZone + 0.5);
    vec3 p = vec3(position.x, uTop - position.y * uHeight[z], position.z);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    vW = p;
    vDepth = position.y;
    vZone = aZone;
    vFace = aFace;
    gl_Position = projectionMatrix * mv;
  }
`;

const COMMON = /* glsl */ `
  uniform float uTime;
  uniform float uLight;
  uniform vec3 uColors[${MAX_ZONES}];
  uniform float uRise[${MAX_ZONES}];
  uniform float uFlash[${MAX_ZONES}];
  uniform float uActive[${MAX_ZONES}];
  // Light rising from the bottom (depth 1) to the top (0) in RISE_S, then fading out.
  float riseAt(int z, float depth) {
    float age = uTime - uRise[z];
    if (age < 0.0 || age > 2.0) return 0.0;
    float front = 1.0 - clamp(age / ${RISE_S.toFixed(2)}, 0.0, 1.0);
    float filled = step(front, depth) * exp(-max(0.0, age - ${RISE_S.toFixed(2)}) * 2.6);
    float bd = (depth - front) / 0.07;
    float band = exp(-bd * bd) * step(age, ${RISE_S.toFixed(2)} + 0.1);
    return filled * 0.55 + band * 1.3;
  }
`;

const FRAG = /* glsl */ `
  ${COMMON}
  uniform vec2 uPlug[${MAX_ZONES}];
  uniform float uBody;
  uniform float uRim;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vW;
  varying float vDepth;
  varying float vZone;
  varying float vFace;
  void main() {
    int z = int(vZone + 0.5);
    vec3 c = uColors[z];
    float ndv = min(1.0, abs(dot(normalize(vN), normalize(vV))));
    float fres = pow(1.0 - ndv, 3.0);
    // Colour strongest at the top, thinning toward the bottom; a light inner haze.
    float grad = mix(1.0, 0.3, vDepth);
    float haze = 0.05 + 0.04 * sin(vW.x * 0.7 + vW.z * 0.5 + vDepth * 5.0 + uTime * 0.3);
    float rise = riseAt(z, vDepth);
    float glow = uFlash[z] + uActive[z] * 0.35;
    // Bottom face: a bright plug and a ring spreading out from it.
    float plugGlow = 0.0;
    if (vFace > 0.5 && vFace < 1.5) {
      float d = distance(vW.xz, uPlug[z]);
      float rr = mod(uTime * 2.2, 7.0);
      float rd = (d - rr) / 0.6;
      float ring = exp(-rd * rd) * (1.0 - rr / 7.0);
      plugGlow = exp(-d * d / 3.0) * 1.0 + ring * 0.7;
    }
    vec3 rgb;
    float cover;
    if (uLight > 0.5) {
      cover = (uBody * grad + fres * uRim * 0.6 + haze) * (1.0 + glow * 0.5) + rise * 0.25 + plugGlow * 0.25;
      rgb = c * cover + mix(c, vec3(1.0), 0.5) * (rise + plugGlow) * 0.35;
    } else {
      // Several glass faces overlap on screen: keep each one faint so the stack doesn't blow out.
      rgb = c * (uBody * grad * (1.0 + glow) + fres * uRim * grad + haze * 0.4) + mix(c, vec3(1.0), 0.35) * (rise * 0.25 + plugGlow * 0.4);
      cover = uBody * 1.5 * grad + fres * 0.1;
    }
    gl_FragColor = vec4(rgb, clamp(cover, 0.0, 1.0));
  }
`;

const EDGE_VERT = /* glsl */ `
  attribute float aZone;
  uniform float uTop;
  uniform float uHeight[${MAX_ZONES}];
  varying float vDepth;
  varying float vZone;
  void main() {
    int z = int(aZone + 0.5);
    vec3 p = vec3(position.x, uTop - position.y * uHeight[z], position.z);
    vDepth = position.y;
    vZone = aZone;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const EDGE_FRAG = /* glsl */ `
  ${COMMON}
  uniform float uEdge;
  varying float vDepth;
  varying float vZone;
  void main() {
    int z = int(vZone + 0.5);
    vec3 c = uColors[z];
    float grad = mix(1.0, 0.35, vDepth);
    float k = uEdge * grad * (1.0 + uFlash[z] + uActive[z] * 0.5) + riseAt(z, vDepth) * 0.8;
    gl_FragColor = uLight > 0.5 ? vec4(c * 0.45 * min(1.0, k), min(1.0, k)) : vec4(mix(c, vec3(1.0), 0.25) * k, 0.0);
  }
`;

function premultiplied(m: THREE.ShaderMaterial): void {
  m.blending = THREE.CustomBlending;
  m.blendSrc = THREE.OneFactor;
  m.blendDst = THREE.OneMinusSrcAlphaFactor;
  m.blendSrcAlpha = THREE.OneFactor;
  m.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
}

/**
 * The knowledge blocks: crates of one ground zone merged into ONE glass prism (top face follows the
 * zone's cells, no gaps), depth ∝ sqrt(papers). Transparent body, fresnel edges and outline,
 * colour fading toward the bottom, a light inner haze. When a cable pulse lands, light rises from
 * bottom to top in 0.6 s; crawled papers flash the block and make it grow (uniform writes only).
 */
export function KnowledgeBlocks() {
  const ground = useWorld((s) => s.ground);
  const theme = useTheme();
  const reduce = useUi((s) => s.settings.reduceMotion);
  const zones = useMemo(() => (ground ? zonesOf(ground) : []), [ground]);

  const geometries = useMemo(() => {
    if (!ground) return null;
    const b = buildBlocks(zones, ground);
    const body = new THREE.BufferGeometry();
    body.setAttribute('position', new THREE.BufferAttribute(b.position, 3));
    body.setAttribute('normal', new THREE.BufferAttribute(b.normal, 3));
    body.setAttribute('aZone', new THREE.BufferAttribute(b.zone, 1));
    body.setAttribute('aFace', new THREE.BufferAttribute(b.face, 1));
    body.setIndex(new THREE.BufferAttribute(b.index, 1));
    const edges = new THREE.BufferGeometry();
    edges.setAttribute('position', new THREE.BufferAttribute(b.edges, 3));
    edges.setAttribute('aZone', new THREE.BufferAttribute(b.edgeZone, 1));
    return { body, edges };
  }, [ground, zones]);

  const shared = useMemo(
    () => ({
      uTime: { value: 0 },
      uTop: { value: BLOCK_TOP_Y },
      uLight: { value: 0 },
      uHeight: { value: new Float32Array(MAX_ZONES).fill(1) },
      uColors: { value: Array.from({ length: MAX_ZONES }, () => new THREE.Color()) },
      uRise: { value: new Float32Array(MAX_ZONES).fill(-1e6) },
      uFlash: { value: new Float32Array(MAX_ZONES) },
      uActive: { value: crawlFx.zoneActivity },
    }),
    [],
  );
  const materials = useMemo(() => {
    const body = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: { ...shared, uPlug: { value: Array.from({ length: MAX_ZONES }, () => new THREE.Vector2()) }, uBody: { value: 0.2 }, uRim: { value: 1 } },
    });
    const edges = new THREE.ShaderMaterial({ vertexShader: EDGE_VERT, fragmentShader: EDGE_FRAG, transparent: true, depthWrite: false, uniforms: { ...shared, uEdge: { value: 1 } } });
    premultiplied(body);
    premultiplied(edges);
    return { body, edges };
  }, [shared]);

  useEffect(() => {
    zones.forEach((z) => {
      (shared.uColors.value[z.index] as THREE.Color).copy(toColor(categoryColor(z.category_index, theme)));
      (materials.body.uniforms.uPlug.value[z.index] as THREE.Vector2).set(z.plug[0], z.plug[1]);
    });
    const dark = theme.additiveGlow;
    shared.uLight.value = dark ? 0 : 1;
    materials.body.uniforms.uBody.value = dark ? 0.07 : 0.16;
    materials.body.uniforms.uRim.value = dark ? 0.45 : 0.55;
    materials.edges.uniforms.uEdge.value = dark ? 0.95 : 0.85;
  }, [theme, zones, shared, materials]);

  useEffect(
    () => () => {
      geometries?.body.dispose();
      geometries?.edges.dispose();
    },
    [geometries],
  );
  useEffect(
    () => () => {
      materials.body.dispose();
      materials.edges.dispose();
    },
    [materials],
  );

  const seen = useMemo(() => ({ height: -1 }), []);
  useFrame(() => {
    const now = nowSec();
    if (crawlFx.heightVersion !== seen.height) {
      seen.height = crawlFx.heightVersion;
      zoneHeights(zones, crawlFx.extra, shared.uHeight.value);
    }
    if (!reduce) shared.uTime.value = now;
    // Crawled papers landing in any crate of the zone flash the whole block.
    const flash = shared.uFlash.value;
    flash.fill(0);
    if (crawlFx.flash.size > 0) {
      for (const z of zones) {
        for (const c of z.crates) {
          const at = crawlFx.flash.get(c.id);
          if (at !== undefined) flash[z.index] = Math.max(flash[z.index], Math.exp(-(now - at) * 2.5) * (theme.additiveGlow ? 0.55 : 0.45));
        }
      }
    }
    const rise = shared.uRise.value;
    for (let i = 0; i < MAX_ZONES; i++) rise[i] = reduce ? -1e6 : crawlFx.zoneRise[i];
  });

  if (!geometries || zones.length === 0) return null;
  return (
    <group name="knowledge-blocks">
      <mesh geometry={geometries.body} material={materials.body} raycast={() => null} renderOrder={1} frustumCulled={false} />
      <lineSegments geometry={geometries.edges} material={materials.edges} raycast={() => null} renderOrder={1} frustumCulled={false} />
    </group>
  );
}
