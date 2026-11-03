import { CloudDownload, Pause, Play, Unplug, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MOCK_WORLD } from '../../api/client';
import { crawlFx, nowSec } from '../../store/crawlFx';
import { useCrawl } from '../../store/crawlStore';
import { useWorld } from '../../store/worldStore';
import { categoryColor } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const fmt = (n: number) => n.toLocaleString('vi-VN');

/** Category dots of streams emitted in the last 3 s (polled 4×/s, not per event). */
function useFlowing(): number[] {
  const [cats, setCats] = useState<number[]>([]);
  useEffect(() => {
    const id = setInterval(() => {
      const t = nowSec();
      const next = [...crawlFx.flowing].filter(([, at]) => t - at < 3).map(([c]) => c).sort((a, b) => a - b);
      setCats((prev) => (prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next));
    }, 250);
    return () => clearInterval(id);
  }, []);
  return cats;
}

function Bar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="grid grid-cols-[4.2rem_1fr_3rem] items-center gap-2 text-caption">
      <span className="text-[var(--ink-muted)]">{label}</span>
      <span className="bar" role="progressbar" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <i style={{ width: `${pct}%`, background: color }} />
      </span>
      <span className="mono text-right">{pct.toFixed(1)}%</span>
    </div>
  );
}

/** Live-crawl section of the settings panel: progress, options and (mock) controls. */
export function CrawlSettings() {
  const status = useCrawl((s) => s.status);
  const connection = useCrawl((s) => s.connection);
  const showRise = useCrawl((s) => s.showRise);
  const mock = useCrawl((s) => s.mock);
  const lastError = useCrawl((s) => s.lastError);
  const done = useCrawl((s) => s.done);
  const categories = useWorld((s) => s.categories);
  const theme = useTheme();
  const flowing = useFlowing();

  const running = status?.running ?? false;
  if (!MOCK_WORLD && !status && connection !== 'reconnecting') return null;

  const conn =
    connection === 'connected' ? (
      <span className="inline-flex items-center gap-1 text-[var(--success)]">
        <Wifi size={12} /> Đã kết nối
      </span>
    ) : connection === 'reconnecting' ? (
      <span className="inline-flex items-center gap-1 text-[var(--warn)]" role="status">
        <Unplug size={12} /> Mất kết nối · đang thử lại…
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-[var(--ink-muted)]">
        <WifiOff size={12} /> Ngoại tuyến
      </span>
    );

  return (
    <section className="mt-4 pt-3 border-t border-[var(--ui-border)] text-xs" aria-label="Cào dữ liệu" data-testid="crawl-hud">
      <div className="flex items-center gap-2 mb-2 font-semibold">
        <CloudDownload size={14} className={running ? 'text-[var(--accent)] animate-pulse' : 'text-[var(--ink-muted)]'} />
        Cào dữ liệu
        <span className="ml-auto font-normal text-caption">{conn}</span>
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-xs">
          {status ? (
            <>
              {running ? 'Đang cào' : done ? 'Đã cào xong' : 'Tạm dừng'}{' '}
              <span className="mono font-semibold">{fmt(status.fetched)}</span> / <span className="mono">{fmt(status.target)}</span>
            </>
          ) : (
            <span className="text-[var(--ink-muted)]">Chưa có dữ liệu tiến độ</span>
          )}
        </div>
        {status && (
          <>
            <Bar label="Đã tải" value={status.fetched} max={status.target} color="var(--accent)" />
            <Bar label="Đã embed" value={status.embedded} max={status.target} color="var(--success)" />
            <div className="flex items-center gap-2">
              <span className="mono">{fmt(Math.round(status.rate_per_min))}</span>
              <span className="text-[var(--ink-muted)]">bài/phút</span>
              <span className="ml-auto flex items-center gap-1" aria-label="Loại bài đang chảy">
                {flowing.map((c) => {
                  const color = categoryColor(c, theme);
                  return <span key={c} className="dot" title={categories[c]?.code} style={{ background: color, color }} />;
                })}
              </span>
            </div>
          </>
        )}
        {lastError && <div className="text-[var(--danger)] text-caption">⚠ {lastError}</div>}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showRise} onChange={(e) => useCrawl.getState().setShowRise(e.target.checked)} className="accent-[var(--accent)]" />
          Hiện hạt lên cây
        </label>
        {MOCK_WORLD && (
          <div className="mt-1 pt-2 border-t border-[var(--ui-border)] flex flex-col gap-1.5" data-testid="crawl-mock">
            <span className="text-micro uppercase tracking-wide text-[var(--ink-muted)]">Giả lập (mock)</span>
            <div className="flex flex-wrap gap-1">
              <button type="button" className="btn !py-1" data-testid="crawl-toggle" onClick={() => useCrawl.getState().setMock({ running: !mock.running })}>
                {mock.running ? <Pause size={12} /> : <Play size={12} />} {mock.running ? 'Dừng cào' : 'Bắt đầu cào'}
              </button>
              {[300, 3000].map((r) => (
                <button key={r} type="button" className="btn !py-1 mono" aria-pressed={mock.ratePerMin === r} onClick={() => useCrawl.getState().setMock({ ratePerMin: r })}>
                  {fmt(r)}/ph
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={mock.offline} data-testid="crawl-offline" onChange={(e) => useCrawl.getState().setMock({ offline: e.target.checked })} className="accent-[var(--warn)]" />
              Giả lập mất kết nối
            </label>
          </div>
        )}
      </div>
    </section>
  );
}
