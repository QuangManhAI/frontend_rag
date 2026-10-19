import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import type * as THREE from 'three';
import { mulberry32 } from '../../../api/mock/rng';
import { crawlBus, crawlFx, nowSec, RISE_DURATION } from '../../../store/crawlFx';
import { useWorld } from '../../../store/worldStore';
import type { Vec3 } from '../../../types/world';
import { categoryColor } from '../../../theme/tokens';
import { useTheme } from '../../../theme/useTheme';
import { hexToRgb } from '../../../utils/canopy';
import { resamplePolyline } from '../../../utils/flight';
import { glowBlending, pointScale, toColor } from '../materials';
import { StreamParticles } from './streamParticles';

const POOL = 4000;
const ROWS = 128;
const SAMPLES = 40;
const TRUNK: Vec3[] = [[0, 0, 0], [0, 12, 0], [0, 24, 0], [0, 35, 0]];

/**
 * Embedded papers travel on: from the top of their crate along THAT crate's root, up the trunk and
 * branch to their twig, arriving exactly when the new vector pops out on the canopy (`born`).
 * Path rows are a small ring cache keyed by (crate, twig).
 */
export function RootRiseParticles() {
  const ground = useWorld((s) => s.ground);
  const nodesById = useWorld((s) => s.nodesById);
  const theme = useTheme();
  const { size, camera, gl } = useThree();
  const stream = useMemo(() => new StreamParticles(POOL, ROWS, SAMPLES), []);

  useEffect(() => {
    stream.material.blending = glowBlending(theme);
    stream.material.uniforms.uSize.value = 0.6;
    stream.material.uniforms.uSpread.value = 0.4;
    stream.material.uniforms.uTail.value.copy(toColor(theme.sap));
    stream.material.uniforms.uTailMix.value = 0.6;
    stream.material.needsUpdate = true;
  }, [theme, stream]);

  useEffect(() => {
    if (!ground) return;
    const rootOf = new Map(ground.roots.map((r) => [r.crate_id, r.path]));
    const rowOf = new Map<string, number>();
    const keyOfRow: string[] = [];
    let nextRow = 0;
    const rng = mulberry32(17);
    const rowFor = (crate: number, twig: number): number | null => {
      const key = `${crate}:${twig}`;
      const hit = rowOf.get(key);
      if (hit !== undefined) return hit;
      const root = rootOf.get(crate);
      const t = nodesById.get(twig);
      const b = t ? nodesById.get(t.parent_id ?? -1) : undefined;
      if (!root || !t || !b) return null;
      const row = nextRow;
      nextRow = (nextRow + 1) % ROWS;
      if (keyOfRow[row]) rowOf.delete(keyOfRow[row]);
      keyOfRow[row] = key;
      rowOf.set(key, row);
      stream.setPath(row, resamplePolyline([...root, ...TRUNK.slice(1), ...b.path.slice(1), ...t.path.slice(1)], SAMPLES));
      return row;
    };
    const onVectors = (items: Parameters<Parameters<typeof crawlBus.vectors.add>[0]>[0], born: number) => {
      const groups = new Map<string, { crate: number; twig: number; cat: number; n: number }>();
      for (const it of items) {
        const k = `${it.crate_id}:${it.twig_id}`;
        const g = groups.get(k);
        if (g) g.n++;
        else groups.set(k, { crate: it.crate_id, twig: it.twig_id, cat: it.category_index, n: 1 });
      }
      for (const g of groups.values()) {
        const row = rowFor(g.crate, g.twig);
        if (row === null) continue;
        const rgb = hexToRgb(categoryColor(g.cat, theme));
        const m = Math.min(5, 1 + Math.floor(g.n / 2));
        for (let k = 0; k < m; k++) {
          const lead = k * 0.07 + rng() * 0.05;
          stream.emit(row, rgb, born - RISE_DURATION + lead, RISE_DURATION - lead, rng() - 0.5, rng() - 0.5);
        }
      }
      if (born > crawlFx.lastEnd) crawlFx.lastEnd = born;
      stream.commit();
    };
    crawlBus.vectors.add(onVectors);
    crawlFx.riseLive = true;
    return () => {
      crawlFx.riseLive = false;
      crawlBus.vectors.delete(onVectors);
    };
  }, [ground, nodesById, stream, theme]);

  useEffect(() => () => stream.dispose(), [stream]);

  useFrame(() => {
    const u = stream.material.uniforms;
    u.uNow.value = nowSec();
    u.uScale.value = pointScale(size.height, (camera as THREE.PerspectiveCamera).fov);
    u.uPixelRatio.value = gl.getPixelRatio();
  });

  return <primitive object={stream.points} />;
}
