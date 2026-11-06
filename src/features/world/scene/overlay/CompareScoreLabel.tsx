import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { anchors, createManualAnchor } from './anchors';

/** Driven by CompareThreads: shows the real score of the vector being compared. */
export const compareLabel = createManualAnchor();

export function CompareScoreLabel() {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const item = { el, pos: new THREE.Vector3(), visible: false };
    anchors.add(item);
    compareLabel.item = item;
    return () => {
      anchors.delete(item);
      compareLabel.item = null;
    };
  }, []);
  return (
    <div ref={ref} className="absolute left-0 top-0" style={{ transformOrigin: '0 0', visibility: 'hidden' }}>
      <div className="compare-score" data-testid="compare-score" />
    </div>
  );
}
