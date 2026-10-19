import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import type * as THREE from 'three';
import type { Crate } from '../../../types/world';
import { mulberry32 } from '../../../api/mock/rng';
import { crawlBus, crawlFx, nowSec, scheduleArrival } from '../../../store/crawlFx';
import { useWorld } from '../../../store/worldStore';
import { categoryColor } from '../../../theme/tokens';
import { useTheme } from '../../../theme/useTheme';
import { hexToRgb } from '../../../utils/canopy';
import { BatchAggregator, columnPath, particlesFor, PATH_SAMPLES, POOL_SIZE, zoneColumns, type FlowQuality } from '../../../utils/crawlFlow';
import { crateHeight } from '../../../utils/groundLayout';
import { glowBlending, pointScale } from '../materials';
import { StreamParticles } from './streamParticles';

const FLUSH_MS = 250;

/**
 * One straight vertical stream per category zone, rising from the knowledge source (y = −40) to
 * the bottom of that zone's crates, in the zone's colour. Batches are merged every 250 ms and
 * summed per zone; one THREE.Points with a fixed pool.
 */
export function CrawlStreams({ quality }: { quality: FlowQuality }) {
  const ground = useWorld((s) => s.ground);
  const theme = useTheme();
  const { size, camera, gl } = useThree();

  const crates = useMemo(() => ground?.crates ?? [], [ground]);
  const maxCount = useMemo(() => Math.max(1, ...crates.map((c) => c.paper_count)), [crates]);
  const zoneCount = useMemo(() => new Set(crates.map((c) => c.category_index)).size, [crates]);
  const stream = useMemo(() => new StreamParticles(POOL_SIZE[quality], Math.max(1, zoneCount), PATH_SAMPLES), [quality, zoneCount]);

  useEffect(() => {
    stream.material.blending = glowBlending(theme);
    stream.material.uniforms.uSize.value = theme.additiveGlow ? 0.75 : 0.9;
    // Jitter is emitted as world-space offsets inside the zone: constant-width columns.
    stream.material.uniforms.uSpread.value = 1;
    stream.material.uniforms.uConverge.value = 0;
    stream.material.needsUpdate = true;
  }, [theme, stream]);

  useEffect(() => {
    if (!ground) return;
    const rng = mulberry32(5);
    const heightOf = (c: Crate) => crateHeight(c.paper_count + (crawlFx.extra.get(c.id) ?? 0), maxCount);
    let columns = zoneColumns(ground, heightOf);
    const rowOfCat = new Map(columns.map((c, i) => [c.category_index, i]));
    columns.forEach((c, i) => stream.setPath(i, columnPath(c)));
    stream.commit();

    const agg = new BatchAggregator();
    const onBatch = (b: Parameters<typeof agg.add>[0]) => agg.add(b);
    crawlBus.batch.add(onBatch);
    const colorCache = new Map<number, [number, number, number]>();
    const perZone = new Map<number, number>();
    const timer = setInterval(() => {
      const t = nowSec();
      const batches = agg.flush().filter((b) => b.stage === 'fetched');
      if (batches.length === 0) return;
      // Crates may have grown since: keep every column landing just under its zone.
      columns = zoneColumns(ground, heightOf);
      perZone.clear();
      for (const b of batches) {
        if (!rowOfCat.has(b.category_index)) continue;
        perZone.set(b.category_index, (perZone.get(b.category_index) ?? 0) + b.count);
        scheduleArrival(b.crate_id, b.count, t + 2.2);
      }
      for (const [cat, count] of perZone) {
        const row = rowOfCat.get(cat) ?? 0;
        const col = columns[row];
        stream.setPath(row, columnPath(col));
        let rgb = colorCache.get(cat);
        if (!rgb) colorCache.set(cat, (rgb = hexToRgb(categoryColor(cat, theme))));
        const n = particlesFor(count, quality);
        const r = col.radius * 0.3;
        let end = t;
        for (let k = 0; k < n; k++) {
          // A continuous ribbon: evenly staggered over the flush window, near-constant speed,
          // spread uniformly over a disc under the zone.
          const start = t + (k / n) * 1.2 + rng() * 0.05;
          const dur = 2.2 + rng() * 0.3;
          const a = rng() * Math.PI * 2;
          const d = Math.sqrt(rng()) * r;
          stream.emit(row, rgb, start, dur, Math.cos(a) * d, Math.sin(a) * d);
          end = Math.max(end, start + dur);
        }
        if (end > crawlFx.lastEnd) crawlFx.lastEnd = end;
      }
      stream.commit();
      crawlFx.poolUsed = stream.used;
    }, FLUSH_MS);
    crawlFx.streamsLive = true;
    return () => {
      crawlFx.streamsLive = false;
      clearInterval(timer);
      crawlBus.batch.delete(onBatch);
      for (const b of agg.flush()) if (b.stage === 'fetched') scheduleArrival(b.crate_id, b.count, nowSec());
    };
  }, [ground, maxCount, stream, theme, quality]);

  useEffect(() => () => stream.dispose(), [stream]);

  useFrame(() => {
    const u = stream.material.uniforms;
    u.uNow.value = nowSec();
    u.uScale.value = pointScale(size.height, (camera as THREE.PerspectiveCamera).fov);
    u.uPixelRatio.value = gl.getPixelRatio();
  });

  return <primitive object={stream.points} />;
}
