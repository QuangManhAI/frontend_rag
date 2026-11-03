import type { ThreeEvent } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { crawlFx, nowSec } from '../../../store/crawlFx';
import { useCrawl } from '../../../store/crawlStore';
import { useFx } from '../../../store/fxStore';
import { useUi } from '../../../store/uiStore';
import { useWorld } from '../../../store/worldStore';
import { categoryColor } from '../../../theme/tokens';
import { useTheme } from '../../../theme/useTheme';
import { cellToWorld } from '../../../utils/groundLayout';
import { sceneIntro } from '../sceneIntro';
import { toColor } from '../materials';

const TILE_H = 0.3;

/** Toggle the canopy filter to one crate (click again to clear). */
export function toggleCrateFilter(crateId: number): void {
  const ui = useUi.getState();
  const w = useWorld.getState();
  if (ui.highlightLabel?.kind === 'crate' && ui.highlightLabel.id === crateId) {
    ui.setHighlights(null, null);
    return;
  }
  const crate = w.ground?.crates.find((c) => c.id === crateId);
  const indices = w.vectorsByCrate.get(crateId) ?? new Uint32Array(0);
  const cat = crate ? w.categories[crate.category_index] : undefined;
  ui.setHighlights(indices, { kind: 'crate', id: crateId, label: `Thùng #${crateId} · ${cat?.code ?? '?'} · ${indices.length} bài` });
}

/** One instanced tile per grid cell; tiles over a crate take the crate's category color. */
export function GroundGrid() {
  const ground = useWorld((s) => s.ground);
  const theme = useTheme();
  const mode = useUi((s) => s.cameraMode);
  const selected = useUi((s) => (s.highlightLabel?.kind === 'crate' ? s.highlightLabel.id : s.highlightLabel?.kind === 'category' ? -2 - s.highlightLabel.id : -1));
  const pulsing = useFx((s) => s.pulsingCrates);
  const crawling = useCrawl((s) => s.visualActive && !s.fading);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const hoverCell = useRef(-1);

  const cols = ground?.grid_size[0] ?? 1;
  const rows = ground?.grid_size[1] ?? 1;
  const tile = ground?.tile_size ?? 1;
  const count = cols * rows;
  const cellCrate = useMemo(() => {
    const arr = new Int32Array(count).fill(-1);
    ground?.crates.forEach((c) => (arr[c.cell[1] * cols + c.cell[0]] = c.id));
    return arr;
  }, [ground, count, cols]);
  const crateCell = useMemo(() => new Map(ground?.crates.map((c) => [c.id, c.cell[1] * cols + c.cell[0]]) ?? []), [ground, cols]);
  const baseColors = useRef(new Float32Array(count * 3));
  const zoneCells = useMemo(() => {
    const out = new Map<number, number[]>();
    ground?.crates.forEach((c) => {
      const list = out.get(c.category_index) ?? [];
      list.push(c.cell[1] * cols + c.cell[0]);
      out.set(c.category_index, list);
    });
    return out;
  }, [ground, cols]);

  const geometry = useMemo(() => new THREE.BoxGeometry(tile * 0.93, TILE_H, tile * 0.93), [tile]);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.94 }), []);
  const lines = useMemo(() => {
    const pts: number[] = [];
    const hx = (cols * tile) / 2;
    const hz = (rows * tile) / 2;
    for (let c = 0; c <= cols; c++) pts.push(-hx + c * tile, 0.02, -hz, -hx + c * tile, 0.02, hz);
    for (let r = 0; r <= rows; r++) pts.push(-hx, 0.02, -hz + r * tile, hx, 0.02, -hz + r * tile);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [cols, rows, tile]);
  const lineMaterial = useMemo(() => new THREE.LineBasicMaterial({ transparent: true, toneMapped: false }), []);
  const lineOpacity = useRef(0);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m || !ground) return;
    const o = new THREE.Object3D();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const [x, , z] = cellToWorld([c, r], ground.grid_size, tile);
        o.position.set(x, -TILE_H / 2, z);
        o.updateMatrix();
        m.setMatrixAt(r * cols + c, o.matrix);
      }
    }
    m.instanceMatrix.needsUpdate = true;
  }, [ground, rows, cols, tile]);

  // Theme or filter change → recolor instances only (geometry untouched).
  useEffect(() => {
    const m = mesh.current;
    if (!m || !ground) return;
    const base = toColor(theme.groundBase);
    const col = new THREE.Color();
    const byId = new Map(ground.crates.map((c) => [c.id, c]));
    for (let i = 0; i < count; i++) {
      const crate = cellCrate[i] >= 0 ? byId.get(cellCrate[i]) : undefined;
      if (crate) {
        col.copy(toColor(categoryColor(crate.category_index, theme))).multiplyScalar(theme.tileSaturation);
        const isSel = selected === crate.id || selected === -2 - crate.category_index;
        if (selected !== -1 && !isSel) col.lerp(base, 0.6);
        if (isSel) col.multiplyScalar(theme.additiveGlow ? 1.6 : 1.1);
      } else col.copy(base);
      baseColors.current.set([col.r, col.g, col.b], i * 3);
      m.setColorAt(i, col);
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    lineMaterial.color.copy(toColor(theme.groundLine));
    // 40% dimmer than before so the lines don't compete with the cables and glass blocks.
    lineOpacity.current = (theme.additiveGlow ? 0.55 : 0.8) * 0.6;
    lineMaterial.opacity = lineOpacity.current * sceneIntro.value;
  }, [theme, ground, count, cellCrate, selected, lineMaterial]);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
    lines.dispose();
    lineMaterial.dispose();
  }, [geometry, material, lines, lineMaterial]);

  const prevPulse = useRef<Set<number>>(new Set());
  const tmp = useMemo(() => new THREE.Color(), []);
  useFrame((state, dt) => {
    const m = mesh.current;
    if (!m) return;
    // Opacity eases to the target in ~400 ms; see-through in "ground" mode.
    // While crawling, thin the ground a little so the streams underneath read through it.
    const target = (mode === 'ground' ? theme.groundSeeThrough : crawling ? Math.min(theme.groundOpacity, 0.62) : theme.groundOpacity) * sceneIntro.value;
    if (sceneIntro.value < 1) lineMaterial.opacity = lineOpacity.current * sceneIntro.value;
    material.opacity += (target - material.opacity) * Math.min(1, dt * 9);
    material.depthWrite = material.opacity > 0.8;
    // Pulse tiles of crates holding the retrieved papers.
    const t = state.clock.elapsedTime;
    let dirty = false;
    for (const id of prevPulse.current) {
      if (pulsing.has(id)) continue;
      const cell = crateCell.get(id);
      if (cell !== undefined) {
        tmp.fromArray(baseColors.current, cell * 3);
        m.setColorAt(cell, tmp);
        dirty = true;
      }
    }
    prevPulse.current = pulsing;
    for (const id of pulsing) {
      const cell = crateCell.get(id);
      if (cell === undefined) continue;
      const k = 1 + (theme.additiveGlow ? 1.4 : 0.35) * (0.5 + 0.5 * Math.sin(t * 5 + id)); // trig-ok: scalar oscillation, rotor measured 1.08-1.31x slower (trig-audit §3)
      tmp.fromArray(baseColors.current, cell * 3).multiplyScalar(k);
      m.setColorAt(cell, tmp);
      dirty = true;
    }
    // Crawl arrivals: the tile above a crate flashes in the crate's colour.
    if (crawlFx.flash.size > 0) {
      const now = nowSec();
      for (const [id, at] of crawlFx.flash) {
        const cell = crateCell.get(id);
        if (cell === undefined || pulsing.has(id)) continue;
        const age = now - at;
        tmp.fromArray(baseColors.current, cell * 3);
        if (age < 1.2) tmp.multiplyScalar(1 + (theme.additiveGlow ? 1.8 : 0.18) * Math.exp(-age * 3));
        m.setColorAt(cell, tmp);
        dirty = true;
      }
    }
    // A cable pulse reached a block: the tiles of that zone flash softly.
    if (crawlFx.zoneFlash.size > 0) {
      const now = nowSec();
      for (const [cat, at] of crawlFx.zoneFlash) {
        const age = now - at;
        const k = age < 0.9 ? 1 + (theme.additiveGlow ? 0.45 : 0.08) * Math.exp(-age * 4) : 1;
        for (const cell of zoneCells.get(cat) ?? []) {
          if (pulsing.has(cellCrate[cell]) || crawlFx.flash.has(cellCrate[cell])) continue;
          tmp.fromArray(baseColors.current, cell * 3).multiplyScalar(k);
          m.setColorAt(cell, tmp);
        }
        if (age >= 0.9) crawlFx.zoneFlash.delete(cat);
        dirty = true;
      }
    }
    if (dirty && m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  if (!ground) return null;

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const cell = e.instanceId ?? -1;
    const ui = useUi.getState();
    if (ui.hoveredVectorIndex !== null) return;
    const crate = cell >= 0 ? cellCrate[cell] : -1;
    if (crate >= 0) {
      ui.setTooltip({ kind: 'crate', id: crate, x: e.nativeEvent.clientX, y: e.nativeEvent.clientY });
      document.body.style.cursor = 'pointer';
    } else if (hoverCell.current >= 0) {
      ui.setTooltip(null);
      document.body.style.cursor = '';
    }
    hoverCell.current = crate;
  };
  const onOut = () => {
    hoverCell.current = -1;
    if (useUi.getState().tooltip?.kind === 'crate') useUi.getState().setTooltip(null);
    document.body.style.cursor = '';
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 4 || useUi.getState().hoveredVectorIndex !== null) return;
    const cell = e.instanceId ?? -1;
    const crate = cell >= 0 ? cellCrate[cell] : -1;
    if (crate < 0) return;
    e.stopPropagation();
    toggleCrateFilter(crate);
  };

  return (
    <group>
      <instancedMesh ref={mesh} args={[geometry, material, count]} onPointerMove={onMove} onPointerOut={onOut} onClick={onClick} renderOrder={2} />
      <lineSegments geometry={lines} material={lineMaterial} renderOrder={3} />
    </group>
  );
}
