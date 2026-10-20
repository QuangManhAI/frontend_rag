import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useWorld } from '../../../store/worldStore';
import { categoryColor } from '../../../theme/tokens';
import { useTheme } from '../../../theme/useTheme';
import { hexToRgb } from '../../../utils/canopy';
import { rootRadiusAt, rootVertexColor, tubeAlongPath } from '../../../utils/treeGeometry';
import { addVertexColorGlow } from '../materials';
import { TRUNK_BASE_RADIUS } from './Trunk';

const TUBULAR = 28;
const RADIAL = 6;

/** All roots merged into one mesh; vertex colors blend crate color → trunk color. */
export function Roots() {
  const ground = useWorld((s) => s.ground);
  const theme = useTheme();
  const glow = useMemo(() => ({ value: 0.4 }), []);

  const { geometry, ranges } = useMemo(() => {
    if (!ground || ground.roots.length === 0) return { geometry: null, ranges: [] as { start: number; count: number; category: number }[] };
    const byId = new Map(ground.crates.map((c) => [c.id, c]));
    const parts: THREE.BufferGeometry[] = [];
    const ranges: { start: number; count: number; category: number }[] = [];
    let start = 0;
    for (const r of ground.roots) {
      const g = tubeAlongPath(r.path, { radius: (t) => rootRadiusAt(t, 0.12, TRUNK_BASE_RADIUS), tubularSegments: TUBULAR, radialSegments: RADIAL });
      parts.push(g);
      const count = g.attributes.position.count;
      ranges.push({ start, count, category: byId.get(r.crate_id)?.category_index ?? -1 });
      start += count;
    }
    const merged = mergeGeometries(parts, false);
    parts.forEach((p) => p.dispose());
    merged.computeBoundingSphere();
    return { geometry: merged, ranges };
  }, [ground]);

  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.05 });
    addVertexColorGlow(m, glow, 'roots');
    return m;
  }, [glow]);

  // Theme change → rewrite the color attribute in place.
  useEffect(() => {
    if (!geometry) return;
    const color = geometry.getAttribute('color') as THREE.BufferAttribute;
    const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
    const trunk = hexToRgb(theme.trunk);
    for (const r of ranges) {
      const crate = hexToRgb(categoryColor(r.category, theme));
      for (let v = r.start; v < r.start + r.count; v++) {
        const [cr, cg, cb] = rootVertexColor(uv.getY(v), crate, trunk);
        color.setXYZ(v, cr, cg, cb);
      }
    }
    color.needsUpdate = true;
    glow.value = theme.additiveGlow ? 0.55 : 0.12;
  }, [theme, geometry, ranges, glow]);

  useEffect(() => () => {
    geometry?.dispose();
    material.dispose();
  }, [geometry, material]);

  if (!geometry) return null;
  return <mesh geometry={geometry} material={material} raycast={() => null} />;
}
