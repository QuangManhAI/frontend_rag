import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useRag } from '../../../store/ragStore';
import { useUi } from '../../../store/uiStore';
import { useWorld } from '../../../store/worldStore';
import { lodLevel } from '../../../utils/lod';
import { Anchor, overlayCamera } from '../overlay/anchors';

const NEAR_TWIG = 70;

/** Depth-1 labels always (hidden while a question animates); depth-2 only when the camera is close. */
export function BranchLabels() {
  const tree = useWorld((s) => s.tree);
  const visual = useRag((s) => s.visualPhase);
  const focusing = useUi((s) => s.cameraMode === 'focus');
  const narrow = globalThis.matchMedia?.('(max-width: 767px)').matches ?? false;
  const busy = narrow || focusing || (visual !== 'idle' && visual !== 'done' && visual !== 'error');
  const branches = useMemo(() => tree.filter((n) => n.depth === 1), [tree]);
  const twigs = useMemo(() => tree.filter((n) => n.depth === 2), [tree]);
  const [nearTwigs, setNearTwigs] = useState<number[]>([]);

  useEffect(() => {
    const tmp = new THREE.Vector3();
    const id = setInterval(() => {
      const cam = overlayCamera.current;
      if (!cam) return;
      const near = twigs
        .filter((t) => lodLevel(cam.position.distanceTo(tmp.set(t.position[0], t.position[1], t.position[2])), [NEAR_TWIG]) === 0)
        .slice(0, 24)
        .map((t) => t.id);
      setNearTwigs((prev) => (prev.length === near.length && prev.every((v, i) => v === near[i]) ? prev : near));
    }, 250);
    return () => clearInterval(id);
  }, [twigs]);

  return (
    <>
      {branches.map((b) => (
        <Anchor key={b.id} position={[b.position[0], b.position[1] + 3, b.position[2]]} visible={!busy}>
          <div className="label3d">
            {b.label.split(' · ').slice(0, 2).join(' · ')} <span className="opacity-60">· {b.leaf_count.toLocaleString('vi-VN')}</span>
          </div>
        </Anchor>
      ))}
      {!busy &&
        nearTwigs.map((id) => {
          const t = twigs.find((x) => x.id === id);
          if (!t) return null;
          return (
            <Anchor key={id} position={[t.position[0], t.position[1] + 2, t.position[2]]}>
              <div className="label3d small">{t.label}</div>
            </Anchor>
          );
        })}
    </>
  );
}
