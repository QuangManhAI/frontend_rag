import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mulberry32 } from '../../../api/mock/rng';
import { crawlBus, crawlFx, nowSec, scheduleArrival } from '../../../store/crawlFx';
import { useUi } from '../../../store/uiStore';
import { useWorld } from '../../../store/worldStore';
import { categoryColor, type ThemeTokens } from '../../../theme/tokens';
import { useTheme } from '../../../theme/useTheme';
import { hexToRgb } from '../../../utils/canopy';
import { BatchAggregator, particlesFor, POOL_SIZE } from '../../../utils/crawlFlow';
import { BLOCK_TOP_Y, buildTubes, CABLE_FADE, CABLE_SAMPLES, cablePath, liftPath, MAX_ZONES, PulseTrain, tubeRadius, zoneHeights, zonesOf } from '../../../utils/feedCables';
import { glowBlending, pointScale, toColor } from '../materials';
import { useFlowQuality } from './CrawlEffects';
import { StreamParticles } from './streamParticles';

/** Tube radius (world units; a tile is 3). */
const RADIUS = 1.25;
const HALO_RADIUS = RADIUS * 3;
/** Seconds for a resting particle to travel the whole cable; a pulse takes PULSE_S. */
const BASE_DUR = 3.6;
const PULSE_S = 2.2;
/** Resting streaks per second per cable (Thấp: about a third). */
const AMBIENT_RATE = { high: 26, low: 8 } as const;
const TICK_MS = 100;

/** Premultiplied "over": the shader outputs emitted light + how much it covers the background. */
function premultiplied(m: THREE.ShaderMaterial): void {
  m.blending = THREE.CustomBlending;
  m.blendSrc = THREE.OneFactor;
  m.blendDst = THREE.OneMinusSrcAlphaFactor;
  m.blendSrcAlpha = THREE.OneFactor;
  m.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
}

const VERT = /* glsl */ `
  attribute float aT;
  attribute float aZone;
  uniform float uLift[${MAX_ZONES}];
  varying vec3 vN;
  varying vec3 vV;
  varying float vT;
  varying float vZone;
  void main() {
    vec3 p = position;
    // Same as liftPath(): the upper part follows the block bottom as the block grows.
    float x = clamp((aT - 0.55) / 0.45, 0.0, 1.0);
    p.y += uLift[int(aZone + 0.5)] * x * x * (3.0 - 2.0 * x);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    vT = aT;
    vZone = aZone;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG_COMMON = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColors[${MAX_ZONES}];
  uniform float uActive[${MAX_ZONES}];
  uniform vec2 uPulses[${MAX_ZONES * 4}];
  uniform float uLight;
  uniform float uFlow;
  varying vec3 vN;
  varying vec3 vV;
  varying float vT;
  varying float vZone;
  float pulsesAt(int z, float t) {
    float s = 0.0;
    for (int k = 0; k < 4; k++) {
      vec2 pl = uPulses[z * 4 + k];
      float p = (uTime - pl.x) / pl.y;
      if (p < 0.0 || p > 1.04) continue;
      float d = (t - p) / 0.03;
      // A bright head with a short trail below it.
      s += exp(-d * d) + 0.35 * exp(-max(0.0, -d) * 0.6) * step(t, p);
    }
    return s;
  }
`;

const CABLE_FRAG = /* glsl */ `
  ${FRAG_COMMON}
  uniform float uBody;
  uniform float uRim;
  uniform float uCore;
  void main() {
    int z = int(vZone + 0.5);
    vec3 c = uColors[z];
    float act = uActive[z];
    float ndv = min(1.0, abs(dot(normalize(vN), normalize(vV))));
    float rim = pow(1.0 - ndv, 2.2);
    // The core: a thin continuous strip along the axis (where the tube faces the viewer).
    float core = pow(ndv, 22.0);
    float coreSoft = pow(ndv, 5.0);
    float fade = smoothstep(0.0, ${CABLE_FADE.toFixed(2)}, vT);
    float flow = mix(1.0, 0.65 + 0.35 * sin(vT * 80.0 - uTime * (5.0 + 9.0 * act)), uFlow);
    float pulse = pulsesAt(z, vT);
    float plug = smoothstep(0.9, 1.0, vT);
    float coreI = uCore * (1.0 + 1.4 * act) * flow + pulse * 3.2 + plug * 1.8;
    vec3 coreCol = mix(c, vec3(1.0), 0.3 + 0.35 * min(1.0, pulse));
    vec3 rgb;
    float cover;
    if (uLight > 0.5) {
      // Pastel glass + a thin dark outline so it reads on a light sky. A white core would vanish
      // on white, so the core is the saturated category colour (pulses still flash toward white).
      cover = uBody + rim * uRim * 0.5;
      rgb = c * 0.9 * cover;
      float edge = 1.0 - smoothstep(0.0, 0.2, ndv);
      rgb = mix(rgb, c * 0.3, edge * 0.8);
      cover = max(cover, edge * 0.75);
      float k = core * min(1.6, coreI) * 0.55 + coreSoft * 0.12 * coreI;
      rgb += mix(c * 0.8, vec3(1.0), 0.4 * min(1.0, pulse)) * k;
      cover += k * 0.8;
    } else {
      // Neon: emitted light (rim + core) over a faint body.
      rgb = c * (rim * uRim + uBody * 0.7) + coreCol * core * coreI + c * coreSoft * 0.3 * coreI;
      cover = uBody * 0.5 + rim * 0.15;
    }
    gl_FragColor = vec4(rgb * fade, clamp(cover, 0.0, 1.0) * fade);
  }
`;

const HALO_FRAG = /* glsl */ `
  ${FRAG_COMMON}
  uniform float uHalo;
  void main() {
    int z = int(vZone + 0.5);
    vec3 c = uColors[z];
    float ndv = min(1.0, abs(dot(normalize(vN), normalize(vV))));
    float fade = smoothstep(0.0, ${CABLE_FADE.toFixed(2)}, vT);
    float k = uHalo * pow(ndv, 2.0) * (1.0 + 1.6 * uActive[z] + 1.2 * pulsesAt(z, vT)) * fade;
    gl_FragColor = uLight > 0.5 ? vec4(c * k * 0.6, k * 0.6) : vec4(c * k, 0.0);
  }
`;

function themeParams(theme: ThemeTokens) {
  return theme.additiveGlow ? { light: 0, body: 0.2, rim: 1.1, core: 1.7, halo: 0.13 } : { light: 1, body: 0.3, rim: 0.9, core: 1.25, halo: 0.07 };
}

/**
 * Knowledge cables: one per ground zone, from beyond the bottom of the frame up into the bottom
 * of that zone's glass block. ONE mesh for all tubes (+ one for the soft halo on "Cao"), with a
 * bright core, energy pulses every 1.5–3 s and resting streaks of particles; while crawling, the
 * cable of a zone receiving papers gets denser pulses, a brighter core and faster particles.
 * Reduce motion: static glowing cables, no pulses, no particles.
 */
export function FeedCables() {
  const ground = useWorld((s) => s.ground);
  const theme = useTheme();
  const reduce = useUi((s) => s.settings.reduceMotion);
  const quality = useFlowQuality();
  const { size, camera } = useThree();

  const zones = useMemo(() => (ground ? zonesOf(ground) : []), [ground]);
  const built = useMemo(() => {
    const heights = zoneHeights(zones, crawlFx.extra, new Float32Array(MAX_ZONES));
    const paths = zones.map((z) => cablePath(z, BLOCK_TOP_Y - heights[z.index]));
    return { heights, paths };
  }, [zones]);

  const geometries = useMemo(() => {
    const make = (radius: number, flare: number, radial: number) => {
      const t = buildTubes(
        built.paths,
        zones.map((z) => z.index),
        (u) => tubeRadius(u, radius, flare),
        radial,
      );
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(t.position, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(t.normal, 3));
      g.setAttribute('aT', new THREE.BufferAttribute(t.along, 1));
      g.setAttribute('aZone', new THREE.BufferAttribute(t.zone, 1));
      g.setIndex(new THREE.BufferAttribute(t.index, 1));
      g.computeBoundingSphere();
      return g;
    };
    return { cable: make(RADIUS, 0.9, 12), halo: make(HALO_RADIUS, 0.3, 10) };
  }, [built, zones]);

  const shared = useMemo(
    () => ({
      uTime: { value: 0 },
      uColors: { value: Array.from({ length: MAX_ZONES }, () => new THREE.Color()) },
      uActive: { value: crawlFx.zoneActivity },
      uLift: { value: new Float32Array(MAX_ZONES) },
      uPulses: { value: new Float32Array(MAX_ZONES * 8).fill(-1e6) },
      uLight: { value: 0 },
      uFlow: { value: 1 },
    }),
    [],
  );
  const materials = useMemo(() => {
    const cable = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: CABLE_FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: { ...shared, uBody: { value: 0.2 }, uRim: { value: 1 }, uCore: { value: 1.5 } },
    });
    const halo = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: HALO_FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: { ...shared, uHalo: { value: 0.1 } },
    });
    premultiplied(cable);
    premultiplied(halo);
    return { cable, halo };
  }, [shared]);

  // Theme: colours + per-theme strengths (uniform writes only).
  useEffect(() => {
    const p = themeParams(theme);
    zones.forEach((z) => (shared.uColors.value[z.index] as THREE.Color).copy(toColor(categoryColor(z.category_index, theme))));
    shared.uLight.value = p.light;
    materials.cable.uniforms.uBody.value = p.body;
    materials.cable.uniforms.uRim.value = p.rim;
    materials.cable.uniforms.uCore.value = p.core;
    materials.halo.uniforms.uHalo.value = p.halo;
  }, [theme, zones, shared, materials]);

  const stream = useMemo(() => (reduce ? null : new StreamParticles(POOL_SIZE[quality], MAX_ZONES, CABLE_SAMPLES)), [reduce, quality]);
  const pulses = useMemo(() => new PulseTrain(MAX_ZONES, mulberry32(23), 4, nowSec()), []);
  const scratch = useMemo(() => ({ travel: new Float32Array(MAX_ZONES).fill(PULSE_S), seenHeight: -1, heights: new Float32Array(MAX_ZONES) }), []);

  useEffect(() => {
    if (!stream) return;
    const u = stream.material.uniforms;
    u.uSize.value = theme.additiveGlow ? 0.3 : 0.34;
    u.uSpread.value = 1;
    u.uConverge.value = 0;
    u.uFadeIn.value = CABLE_FADE;
    u.uMinPx.value = 1.5;
    stream.material.blending = glowBlending(theme);
    stream.material.needsUpdate = true;
  }, [stream, theme]);

  // Streaks: a steady resting flow on every cable, plus crawl batches (merged every 250 ms).
  useEffect(() => {
    if (!stream || zones.length === 0) return;
    const rng = mulberry32(5);
    zones.forEach((z) => stream.setPath(z.index, built.paths[z.index]));
    stream.commit();
    const zoneOfCat = new Map(zones.map((z) => [z.category_index, z]));
    const rgbOf = zones.map((z) => {
      const [r, g, b] = hexToRgb(categoryColor(z.category_index, theme));
      // Light theme: premultiplied colour stays pastel; dark: a touch brighter to cross bloom.
      return (theme.additiveGlow ? [r * 1.25, g * 1.25, b * 1.25] : [r, g, b]) as [number, number, number];
    });
    const acc = new Float32Array(MAX_ZONES);
    const agg = new BatchAggregator();
    const onBatch = (b: Parameters<typeof agg.add>[0]) => agg.add(b);
    crawlBus.batch.add(onBatch);
    let ticks = 0;
    const emit = (zi: number, start: number, speedUp: number, bright: number) => {
      const speed = (1 + (rng() * 2 - 1) * 0.4) * speedUp;
      const dur = BASE_DUR / speed;
      const a = rng() * Math.PI * 2;
      const d = Math.sqrt(rng()) * RADIUS * 0.75;
      const c = rgbOf[zi];
      const rgb: [number, number, number] = bright > 1 ? [c[0] * bright, c[1] * bright, c[2] * bright] : c;
      stream.emit(zi, rgb, start, dur, Math.cos(a) * d, Math.sin(a) * d, (1 + (rng() * 2 - 1) * 0.4) * (bright > 1 ? 1.25 : 1), 3 + rng() * 3);
      return start + dur;
    };
    const timer = setInterval(() => {
      const t = nowSec();
      const act = crawlFx.zoneActivity;
      for (const z of zones) {
        acc[z.index] += AMBIENT_RATE[quality] * (TICK_MS / 1000) * (1 + act[z.index]);
        while (acc[z.index] >= 1) {
          acc[z.index] -= 1;
          emit(z.index, t + rng() * (TICK_MS / 1000), 1 + 0.6 * act[z.index], 1);
        }
      }
      if (++ticks % 3 === 0) {
        // Crawl batches → extra, brighter streaks on that zone's cable, faster with `count`.
        const perZone = new Map<number, number>();
        for (const b of agg.flush()) {
          if (b.stage !== 'fetched') continue;
          const z = zoneOfCat.get(b.category_index);
          if (!z) {
            scheduleArrival(b.crate_id, b.count, t);
            continue;
          }
          perZone.set(z.index, (perZone.get(z.index) ?? 0) + b.count);
          act[z.index] = Math.min(1, act[z.index] + 0.12 * Math.log2(1 + b.count));
          const speedUp = Math.min(2.2, 1 + 0.25 * Math.log2(1 + b.count));
          scheduleArrival(b.crate_id, b.count, t + BASE_DUR / speedUp);
        }
        for (const [zi, count] of perZone) {
          const n = particlesFor(count, quality);
          const speedUp = Math.min(2.2, 1 + 0.25 * Math.log2(1 + count));
          let end = t;
          for (let k = 0; k < n; k++) end = Math.max(end, emit(zi, t + (k / n) * 1.2, speedUp, 1.5));
          if (end > crawlFx.lastEnd) crawlFx.lastEnd = end;
        }
      }
      stream.commit();
      crawlFx.poolUsed = stream.used;
    }, TICK_MS);
    crawlFx.streamsLive = true;
    return () => {
      crawlFx.streamsLive = false;
      clearInterval(timer);
      crawlBus.batch.delete(onBatch);
      for (const b of agg.flush()) if (b.stage === 'fetched') scheduleArrival(b.crate_id, b.count, nowSec());
    };
  }, [stream, zones, built, theme, quality]);

  useEffect(() => () => stream?.dispose(), [stream]);
  useEffect(
    () => () => {
      geometries.cable.dispose();
      geometries.halo.dispose();
    },
    [geometries],
  );
  useEffect(
    () => () => {
      materials.cable.dispose();
      materials.halo.dispose();
    },
    [materials],
  );

  useFrame((_, dt) => {
    const now = nowSec();
    const act = crawlFx.zoneActivity;
    const decay = Math.exp(-dt / 2.5);
    for (let i = 0; i < MAX_ZONES; i++) act[i] *= decay;

    // Blocks grow while crawling: lift the upper part of each cable (tube in the shader, streak paths here).
    if (crawlFx.heightVersion !== scratch.seenHeight) {
      scratch.seenHeight = crawlFx.heightVersion;
      zoneHeights(zones, crawlFx.extra, scratch.heights);
      const lift = shared.uLift.value;
      for (const z of zones) {
        const dy = built.heights[z.index] - scratch.heights[z.index];
        if (Math.abs(dy - lift[z.index]) < 1e-3) continue;
        lift[z.index] = dy;
        stream?.setPath(z.index, liftPath(built.paths[z.index], dy));
      }
    }

    if (reduce) {
      shared.uFlow.value = 0;
      shared.uPulses.value.fill(-1e6);
      return;
    }
    shared.uFlow.value = 1;
    shared.uTime.value = now;
    for (let i = 0; i < MAX_ZONES; i++) scratch.travel[i] = PULSE_S / (1 + 0.8 * act[i]);
    const hits = pulses.update(now, act, scratch.travel);
    for (const zi of hits) {
      const z = zones[zi];
      if (!z) continue;
      crawlFx.zoneRise[zi] = now;
      crawlFx.zoneFlash.set(z.category_index, now);
    }
    shared.uPulses.value.set(pulses.pulses);
    if (stream) {
      const u = stream.material.uniforms;
      u.uNow.value = now;
      u.uScale.value = pointScale(size.height, (camera as THREE.PerspectiveCamera).fov);
    }
  });

  if (zones.length === 0) return null;
  return (
    <group name="feed-cables">
      {quality === 'high' && <mesh geometry={geometries.halo} material={materials.halo} raycast={() => null} renderOrder={0} frustumCulled={false} />}
      <mesh geometry={geometries.cable} material={materials.cable} raycast={() => null} renderOrder={1} frustumCulled={false} />
      {stream && <primitive object={stream.object} renderOrder={1} />}
    </group>
  );
}
