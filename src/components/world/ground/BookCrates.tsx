import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mulberry32 } from '../../../api/mock/rng';
import { crawlFx, nowSec } from '../../../store/crawlFx';
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

/** Seconds a crate glows after crawled papers land in it. */
const FLASH_S = 1.2;

/**
 * One instanced box per crate, hanging below its tile; height ∝ sqrt(paper_count). While crawling,
 * papers landing in a crate (crawlFx) grow it and make it flash — instance matrix/colour updates only.
 */
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
  const crates = useMemo(() => ground?.crates ?? [], [ground]);
  const indexOf = useMemo(() => new Map(crates.map((c, i) => [c.id, i])), [crates]);
  const maxCount = useMemo(() => Math.max(1, ...crates.map((c) => c.paper_count)), [crates]);
  const baseColors = useRef(new Float32Array(0));
  const tmp = useMemo(() => ({ o: new THREE.Object3D(), c: new THREE.Color() }), []);
  const seenHeight = useRef(-1);

  const place = (i: number) => {
    const m = mesh.current;
    if (!m || !ground) return;
    const c = crates[i];
    const [x, , z] = cellToWorld(c.cell, ground.grid_size, ground.tile_size);
    const h = crateHeight(c.paper_count + (crawlFx.extra.get(c.id) ?? 0), maxCount);
    tmp.o.position.set(x, -2 - h / 2, z);
    tmp.o.scale.set(ground.tile_size * 0.78, h, ground.tile_size * 0.78);
    tmp.o.updateMatrix();
    m.setMatrixAt(i, tmp.o.matrix);
  };

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    for (let i = 0; i < crates.length; i++) place(i);
    m.instanceMatrix.needsUpdate = true;
  }, [crates, maxCount]); // `place` reads the same values

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    baseColors.current = new Float32Array(crates.length * 3);
    crates.forEach((c, i) => {
      tmp.c.copy(toColor(categoryColor(c.category_index, theme))).multiplyScalar(0.62);
      tmp.c.toArray(baseColors.current, i * 3);
      m.setColorAt(i, tmp.c);
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    glow.value = theme.additiveGlow ? 0.45 : 0.08;
  }, [theme, crates, glow, tmp]);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    // Heights: crawlFx bumps heightVersion at most 4×/s (arrival timer).
    if (crawlFx.heightVersion !== seenHeight.current) {
      seenHeight.current = crawlFx.heightVersion;
      for (const id of crawlFx.extra.keys()) {
        const i = indexOf.get(id);
        if (i !== undefined) place(i);
      }
      m.instanceMatrix.needsUpdate = true;
    }
    if (crawlFx.flash.size === 0) return;
    const t = nowSec();
    for (const [id, at] of crawlFx.flash) {
      const i = indexOf.get(id);
      if (i === undefined) continue;
      const age = t - at;
      tmp.c.fromArray(baseColors.current, i * 3);
      if (age < FLASH_S) tmp.c.multiplyScalar(1 + (theme.additiveGlow ? 1.6 : 0.3) * Math.exp(-age * 3));
      m.setColorAt(i, tmp.c);
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  if (!ground || crates.length === 0) return null;
  return <instancedMesh ref={mesh} args={[geometry, material, crates.length]} raycast={() => null} />;
}
