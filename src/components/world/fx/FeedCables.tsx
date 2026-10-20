import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import type * as THREE from 'three';
import { mulberry32 } from '../../../api/mock/rng';
import { crawlBus, crawlFx, nowSec, scheduleArrival } from '../../../store/crawlFx';
import { useUi } from '../../../store/uiStore';
import { useWorld } from '../../../store/worldStore';
import { categoryColor } from '../../../theme/tokens';
import { useTheme } from '../../../theme/useTheme';
import { hexToRgb } from '../../../utils/canopy';
import { BatchAggregator, particlesFor, POOL_SIZE } from '../../../utils/crawlFlow';
import { BLOCK_TOP_Y, CABLE_FADE, CABLE_SAMPLES, cablePath, liftPath, MAX_ZONES, PulseTrain, zoneHeights, zonesOf } from '../../../utils/feedCables';
import { glowBlending, pointScale } from '../materials';
import { useFlowQuality } from './CrawlEffects';
import { StreamParticles } from './streamParticles';

/** Streaks are spread uniformly over a disc of this radius around the stream's path. */
const STREAM_RADIUS = 2.4;
/** Seconds for a resting streak to travel the whole stream; a pulse pack takes PULSE_S. */
const BASE_DUR = 3.6;
const PULSE_S = 2.2;
/** Resting streaks per second per stream (Thấp: about a third). */
const AMBIENT_RATE = { high: 40, low: 12 } as const;
/** Streaks in one energy pulse (a tight, bright pack travelling together). */
const PULSE_PACK = { high: 14, low: 6 } as const;
const TICK_MS = 250;

/**
 * Knowledge streams: one stream of particle streaks per ground zone, from beyond the bottom of the
 * frame up into the bottom of that zone's glass block (no geometry for the cable itself). Every
 * 1.5–3 s a bright pack of streaks (an energy pulse) runs up; when it lands, the block fills with
 * light. While crawling, the stream of a zone receiving papers gets denser pulses and more,
 * brighter, faster streaks. Reduce motion: nothing is drawn.
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

  const stream = useMemo(() => (reduce ? null : new StreamParticles(POOL_SIZE[quality], MAX_ZONES, CABLE_SAMPLES)), [reduce, quality]);
  const pulses = useMemo(() => new PulseTrain(MAX_ZONES, mulberry32(23), 4, nowSec()), []);
  const scratch = useMemo(
    () => ({ travel: new Float32Array(MAX_ZONES).fill(PULSE_S), seenHeight: -1, heights: new Float32Array(MAX_ZONES), lift: new Float32Array(MAX_ZONES) }),
    [],
  );
  const rng = useMemo(() => mulberry32(5), []);
  // Per-zone colour: brighter on dark skies (heads cross the bloom threshold); deeper on light
  // skies, where a brighter pastel would wash out to white.
  const rgbOf = useMemo(
    () =>
      zones.map((z) => {
        const [r, g, b] = hexToRgb(categoryColor(z.category_index, theme));
        const k = theme.additiveGlow ? 1.5 : 0.8;
        return [r * k, g * k, b * k] as [number, number, number];
      }),
    [zones, theme],
  );

  useEffect(() => {
    if (!stream) return;
    const u = stream.material.uniforms;
    u.uSize.value = theme.additiveGlow ? 0.6 : 0.65;
    u.uGain.value = theme.additiveGlow ? 1.6 : 0.75;
    u.uSpread.value = 1;
    u.uConverge.value = 0;
    u.uFadeIn.value = CABLE_FADE;
    u.uMinPx.value = 2.2;
    stream.material.blending = glowBlending(theme);
    stream.material.needsUpdate = true;
  }, [stream, theme]);

  // A steady resting flow on every stream, plus crawl batches (merged every 250 ms).
  useEffect(() => {
    if (!stream || zones.length === 0) return;
    const emit = (zi: number, start: number, speedUp: number, bright: number) => {
      const speed = (1 + (rng() * 2 - 1) * 0.4) * speedUp;
      const dur = BASE_DUR / speed;
      const a = rng() * Math.PI * 2;
      const d = Math.sqrt(rng()) * STREAM_RADIUS;
      const c = rgbOf[zi];
      const rgb: [number, number, number] = bright !== 1 ? [c[0] * bright, c[1] * bright, c[2] * bright] : c;
      stream.emit(zi, rgb, start, dur, Math.cos(a) * d, Math.sin(a) * d, (1 + (rng() * 2 - 1) * 0.4) * (bright > 1 ? 1.3 : 1), 3 + rng() * 3);
      return start + dur;
    };
    zones.forEach((z) => stream.setPath(z.index, liftPath(built.paths[z.index], scratch.lift[z.index])));
    stream.commit();
    const zoneOfCat = new Map(zones.map((z) => [z.category_index, z]));
    const acc = new Float32Array(MAX_ZONES);
    const agg = new BatchAggregator();
    const onBatch = (b: Parameters<typeof agg.add>[0]) => agg.add(b);
    crawlBus.batch.add(onBatch);
    let ticks = 0;
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
        // Crawl batches → extra, brighter streaks on that zone's stream, faster with `count`.
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
          scheduleArrival(b.crate_id, b.count, t + BASE_DUR / Math.min(2.2, 1 + 0.25 * Math.log2(1 + b.count)));
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
  }, [stream, zones, built, rgbOf, rng, quality, scratch]);

  useEffect(() => () => stream?.dispose(), [stream]);

  useFrame((_, dt) => {
    const now = nowSec();
    const act = crawlFx.zoneActivity;
    const decay = Math.exp(-dt / 2.5);
    for (let i = 0; i < MAX_ZONES; i++) act[i] *= decay;

    // Blocks grow while crawling: the upper part of each stream follows its block bottom.
    if (crawlFx.heightVersion !== scratch.seenHeight) {
      scratch.seenHeight = crawlFx.heightVersion;
      zoneHeights(zones, crawlFx.extra, scratch.heights);
      for (const z of zones) {
        const dy = built.heights[z.index] - scratch.heights[z.index];
        if (Math.abs(dy - scratch.lift[z.index]) < 1e-3) continue;
        scratch.lift[z.index] = dy;
        stream?.setPath(z.index, liftPath(built.paths[z.index], dy));
      }
    }
    if (!stream) return;

    for (let i = 0; i < MAX_ZONES; i++) scratch.travel[i] = PULSE_S / (1 + 0.8 * act[i]);
    const hits = pulses.update(now, act, scratch.travel);
    // A pulse is a tight pack of bright streaks that all arrive together.
    for (const zi of pulses.started) {
      if (zi >= zones.length) continue;
      const c = rgbOf[zi];
      for (let k = 0; k < PULSE_PACK[quality]; k++) {
        const a = rng() * Math.PI * 2;
        const d = Math.sqrt(rng()) * STREAM_RADIUS * 0.35;
        stream.emit(zi, [c[0] * 2.2, c[1] * 2.2, c[2] * 2.2], now - rng() * 0.06, scratch.travel[zi], Math.cos(a) * d, Math.sin(a) * d, 1.5 + rng() * 0.5, 5 + rng() * 2);
      }
    }
    if (pulses.started.length > 0) stream.commit();
    for (const zi of hits) {
      const z = zones[zi];
      if (!z) continue;
      crawlFx.zoneRise[zi] = now;
      crawlFx.zoneFlash.set(z.category_index, now);
    }
    const u = stream.material.uniforms;
    u.uNow.value = now;
    u.uScale.value = pointScale(size.height, (camera as THREE.PerspectiveCamera).fov);
  });

  if (!stream || zones.length === 0) return null;
  return <primitive object={stream.object} />;
}
