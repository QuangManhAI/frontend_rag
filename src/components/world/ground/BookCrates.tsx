import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mulberry32 } from '../../../api/mock/rng';
import { useWorld } from '../../../store/worldStore';
import { categoryColor } from '../../../theme/tokens';
import { useTheme } from '../../../theme/useTheme';
import { cellToWorld, crateHeight } from '../../../utils/groundLayout';
import { addVertexColorGlow, toColor } from '../materials';

let spineTexture: THREE.CanvasTexture | null = null;

/** Grayscale "book spines" texture (tinted per instance), drawn once on a canvas. */
function getSpineTexture(): THREE.CanvasTexture {
  if (spineTexture) return spineTexture;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  if (g) {
    const rng = mulberry32(3);
    let x = 0;
    while (x < 256) {
      const w = 6 + Math.floor(rng() * 14);
      const v = Math.floor(150 + rng() * 105);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(x, 0, w, 256);
      g.fillStyle = 'rgba(0,0,0,0.55)';
      g.fillRect(x + w - 1.5, 0, 1.5, 256);
      g.fillStyle = 'rgba(255,255,255,0.35)';
      const band = 30 + rng() * 40;
      g.fillRect(x + 1, band, w - 3, 3);
      g.fillRect(x + 1, 256 - band, w - 3, 3);
      x += w;
    }
    g.fillStyle = 'rgba(0,0,0,0.4)';
    g.fillRect(0, 0, 256, 4);
    g.fillRect(0, 252, 256, 4);
  }
  spineTexture = new THREE.CanvasTexture(c);
  spineTexture.colorSpace = THREE.SRGBColorSpace;
  spineTexture.wrapS = spineTexture.wrapT = THREE.RepeatWrapping;
  spineTexture.repeat.set(1, 1.6);
  return spineTexture;
}

/** One instanced box per crate, hanging below its tile; height ∝ sqrt(paper_count). */
export function BookCrates() {
  const ground = useWorld((s) => s.ground);
  const theme = useTheme();
  const mesh = useRef<THREE.InstancedMesh>(null);
  const glow = useMemo(() => ({ value: 0.3 }), []);
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map: getSpineTexture(), roughness: 0.75, metalness: 0.05 });
    addVertexColorGlow(m, glow, 'book-crates');
    return m;
  }, [glow]);
  const crates = ground?.crates ?? [];

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m || !ground) return;
    const max = Math.max(1, ...ground.crates.map((c) => c.paper_count));
    const o = new THREE.Object3D();
    ground.crates.forEach((c, i) => {
      const [x, , z] = cellToWorld(c.cell, ground.grid_size, ground.tile_size);
      const h = crateHeight(c.paper_count, max);
      o.position.set(x, -2 - h / 2, z);
      o.scale.set(ground.tile_size * 0.78, h, ground.tile_size * 0.78);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [ground]);

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const col = new THREE.Color();
    crates.forEach((c, i) => m.setColorAt(i, col.copy(toColor(categoryColor(c.category_index, theme))).multiplyScalar(0.62)));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    glow.value = theme.additiveGlow ? 0.45 : 0.08;
  }, [theme, crates, glow]);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  if (!ground || crates.length === 0) return null;
  return <instancedMesh ref={mesh} args={[geometry, material, crates.length]} raycast={() => null} />;
}
