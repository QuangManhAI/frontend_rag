import { CalendarRange, Play, Square } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useUi } from '../../store/uiStore';
import { useWorld } from '../../store/worldStore';

/** Hide vectors published after the chosen year (shader uniform) — watch the tree grow its leaves. */
export function YearSlider() {
  const vectors = useWorld((s) => s.vectors);
  const maxYear = useUi((s) => s.maxYear);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [lo, hi] = useMemo(() => {
    if (!vectors || vectors.count === 0) return [2000, 2026];
    let a = Infinity;
    let b = -Infinity;
    for (let i = 0; i < vectors.count; i++) {
      a = Math.min(a, vectors.years[i]);
      b = Math.max(b, vectors.years[i]);
    }
    return [a, b];
  }, [vectors]);
  const value = maxYear ?? hi;
  const visible = useMemo(() => {
    if (!vectors) return 0;
    let n = 0;
    for (let i = 0; i < vectors.count; i++) if (vectors.years[i] <= value) n++;
    return n;
  }, [vectors, value]);

  useEffect(() => {
    if (!playing) return;
    let y = lo;
    useUi.getState().setMaxYear(y);
    timer.current = setInterval(() => {
      y++;
      if (y >= hi) {
        useUi.getState().setMaxYear(null);
        setPlaying(false);
      } else useUi.getState().setMaxYear(y);
    }, 450);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, lo, hi]);

  if (!vectors) return null;
  return (
    <div className="glass glass-strong flex items-center gap-3 px-3 py-2 text-xs w-[min(28rem,calc(100vw-2rem))]">
      <CalendarRange size={14} className="text-[var(--accent)] flex-none" />
      <label htmlFor="year-slider" className="whitespace-nowrap">
        Năm ≤ <span className="mono font-semibold">{value}</span>
      </label>
      <input
        id="year-slider"
        type="range"
        min={lo}
        max={hi}
        value={value}
        className="flex-1 min-w-0"
        onChange={(e) => {
          const y = Number(e.target.value);
          useUi.getState().setMaxYear(y >= hi ? null : y);
        }}
      />
      <span className="mono text-[var(--ink-muted)] w-16 text-right">{visible.toLocaleString('vi-VN')}</span>
      <button type="button" className="btn btn-icon" aria-label={playing ? 'Dừng phát' : 'Phát theo thời gian'} onClick={() => setPlaying(!playing)}>
        {playing ? <Square size={12} /> : <Play size={12} />}
      </button>
    </div>
  );
}
