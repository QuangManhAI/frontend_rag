import { useMemo } from 'react';
import { hashString, mulberry32 } from '../../../api/mock/rng';
import { QUERY_ORIGIN } from '../../../utils/flight';
import { Anchor } from '../overlay/anchors';

/**
 * Decorative strip under the orb while embedding. The backend does not send the query
 * embedding, so these digits are illustrative only (labelled as such in ASSUMPTIONS.md).
 */
export function VectorDigits({ text, dims = 768 }: { text: string; dims?: number }) {
  const digits = useMemo(() => {
    const rng = mulberry32(hashString(text));
    return Array.from({ length: 4 }, () => {
      const v = (rng() - 0.5) * 0.24;
      return `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(3)}`;
    }).join(', ');
  }, [text]);
  return (
    <Anchor position={[QUERY_ORIGIN[0], QUERY_ORIGIN[1] - 2.5, QUERY_ORIGIN[2]]}>
      <div className="digits-ring" aria-hidden>
        [{digits}, …] · {dims} chiều
      </div>
    </Anchor>
  );
}
