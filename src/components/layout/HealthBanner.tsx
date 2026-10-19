import { AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getHealth } from '../../api/client';
import type { HealthStatus } from '../../types/world';

const LABEL: Record<keyof HealthStatus, string> = { lancedb: 'LanceDB', llm: 'LLM', world: 'World data' };

/** Polls /rag/health at start-up and every 30 s; shows a banner only when something is down. */
export function useHealth(): HealthStatus | 'unreachable' | null {
  const [health, setHealth] = useState<HealthStatus | 'unreachable' | null>(null);
  useEffect(() => {
    let alive = true;
    const check = () =>
      getHealth()
        .then((h) => alive && setHealth(h))
        .catch(() => alive && setHealth('unreachable'));
    void check();
    const id = setInterval(check, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return health;
}

export function HealthDots({ health }: { health: HealthStatus | 'unreachable' | null }) {
  if (!health) return <span className="mono text-[0.65rem] text-[var(--ink-muted)]">health…</span>;
  return (
    <span className="hidden md:inline-flex items-center gap-2 text-[0.65rem] mono text-[var(--ink-muted)]" aria-label="Trạng thái hệ thống">
      {(Object.keys(LABEL) as (keyof HealthStatus)[]).map((k) => {
        const ok = health !== 'unreachable' && health[k];
        return (
          <span key={k} className="inline-flex items-center gap-1">
            <span className="dot !w-1.5 !h-1.5" style={{ background: ok ? 'var(--success)' : 'var(--danger)', color: ok ? 'var(--success)' : 'var(--danger)' }} />
            {LABEL[k]}
          </span>
        );
      })}
    </span>
  );
}

export function HealthBanner({ health }: { health: HealthStatus | 'unreachable' | null }) {
  if (!health) return null;
  const down = health === 'unreachable' ? ['Backend'] : (Object.keys(LABEL) as (keyof HealthStatus)[]).filter((k) => !health[k]).map((k) => LABEL[k]);
  if (down.length === 0) return null;
  return (
    <div role="status" className="glass px-3 py-1.5 text-xs flex items-center gap-2 border-[var(--warn)]! fade-in" data-testid="health-banner">
      <AlertTriangle size={14} className="text-[var(--warn)]" /> {down.join(', ')} không phản hồi — câu trả lời có thể lỗi.
    </div>
  );
}
