import { Line } from '@react-three/drei';
import { useFx } from '../../../store/fxStore';
import { useRag } from '../../../store/ragStore';
import { useWorld } from '../../../store/worldStore';
import { useTheme } from '../../../theme/useTheme';
import { opaqueHex } from '../../../theme/tokens';
import { vectorPosition } from '../../../utils/flight';

/** Threads from the resting orb to each top-k vector; width ∝ final_score; uncited ones fade when done. */
export function TopKThreads() {
  const topK = useFx((s) => s.topK);
  const anchor = useFx((s) => s.anchor);
  const vectors = useWorld((s) => s.vectors);
  const visual = useRag((s) => s.visualPhase);
  const checks = useRag((s) => s.current.citationChecks);
  const theme = useTheme();
  if (!anchor || !vectors || topK.length === 0) return null;
  if (visual !== 'found' && visual !== 'generating' && visual !== 'done') return null;
  const cited = new Set(checks.filter((c) => c.status === 'verified').map((c) => c.paper_id));
  return (
    <group>
      {topK.map((t) => {
        const faded = visual === 'done' && !cited.has(t.paper_id);
        return (
          <Line
            key={t.paper_id}
            points={[anchor, vectorPosition(vectors, t.index)]}
            color={opaqueHex(theme.thread)}
            lineWidth={1 + Math.max(0, t.final_score) * 3.5}
            transparent
            opacity={faded ? 0.18 : 0.85}
            toneMapped={false}
            depthWrite={false}
          />
        );
      })}
    </group>
  );
}
