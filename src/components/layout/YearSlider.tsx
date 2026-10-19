import { CalendarRange, Play, Square } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useUi } from '../../store/uiStore';
import { useWorld } from '../../store/worldStore';

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

/**
 * Settings section: hide vectors published after the chosen year (shader uniform) — press play to
 * watch the tree grow its leaves (while the settings stay open).
 */
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

  // Closing the settings mid-playback: don't leave the tree stuck at an intermediate year.
  const playingRef = useRef(playing);
  playingRef.current = playing;
  useEffect(
    () => () => {
      if (playingRef.current) useUi.getState().setMaxYear(null);
    },
    [],
  );

  if (!vectors) return null;
  return (
    <section className="mt-4 pt-3 border-t border-[var(--ui-border)] text-xs" aria-label="Lọc theo năm" data-testid="year-panel">
      <div className="flex items-center gap-2 mb-2 font-semibold">
        <CalendarRange size={14} className="text-[var(--accent)] flex-none" />
        <label htmlFor="year-slider">
          Năm ≤ <span className="mono">{value}</span>
        </label>
        <span className="ml-auto font-normal mono text-[var(--ink-muted)]" title={`${visible.toLocaleString('vi-VN')} bài đang hiện`}>
          {compact.format(visible)} bài
        </span>
      </div>
      <div className="flex items-center gap-2">
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
        <button type="button" className="btn btn-icon" aria-label={playing ? 'Dừng phát' : 'Phát theo thời gian'} onClick={() => setPlaying(!playing)}>
          {playing ? <Square size={12} /> : <Play size={12} />}
        </button>
      </div>
    </section>
  );
}
