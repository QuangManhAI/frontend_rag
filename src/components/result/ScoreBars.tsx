import type { GroundedChunk } from '../../types/rag';

const ROWS: ReadonlyArray<{ key: 'similarity_score' | 'authority_score' | 'final_score'; label: string; color: string }> = [
  { key: 'similarity_score', label: 'similarity', color: 'var(--accent)' },
  { key: 'authority_score', label: 'authority', color: 'var(--warn)' },
  { key: 'final_score', label: 'final', color: 'var(--success)' },
];

/** Backend scores as small bars, numbers in monospace (3 decimals). */
export function ScoreBars({ chunk, compact = false }: { chunk: GroundedChunk; compact?: boolean }) {
  return (
    <dl className={`grid gap-1 ${compact ? 'text-[0.65rem]' : 'text-[0.7rem]'}`}>
      {ROWS.map((r) => {
        const v = chunk[r.key];
        return (
          <div key={r.key} className="grid grid-cols-[4.6rem_1fr_2.8rem] items-center gap-2">
            <dt className="text-[var(--ink-muted)]">{r.label}</dt>
            <dd className="bar" aria-hidden>
              <i style={{ width: `${Math.max(0, Math.min(1, v)) * 100}%`, background: r.color }} />
            </dd>
            <dd className="mono text-right">{v.toFixed(3)}</dd>
          </div>
        );
      })}
    </dl>
  );
}
