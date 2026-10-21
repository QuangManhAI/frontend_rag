/**
 * Shown when the world fails to load. There is no loading screen: the chrome slides in right away
 * and the scene lights up once it is ready (see sceneIntro).
 */
export function WorldError({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="absolute inset-0 grid place-items-center z-30 bg-[radial-gradient(ellipse_at_center,var(--bg-horizon),var(--bg))]" data-testid="world-error">
      <div className="flex flex-col items-center gap-4 text-center px-6">
        <svg viewBox="0 0 120 120" width="132" height="132" className="loading-tree" aria-hidden>
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" filter="url(#glow)">
            <path className="branch" d="M60 112 C60 92 58 80 60 64" />
            <path className="branch" d="M60 78 C50 68 40 64 30 50" />
            <path className="branch" d="M60 72 C70 62 82 58 90 44" />
            <path className="branch" d="M60 66 C58 52 62 40 60 26" />
            <path className="branch" d="M60 112 C50 114 40 116 28 116 M60 112 C70 114 82 116 94 116" strokeWidth="1.4" />
          </g>
          {[
            [30, 50, 0],
            [90, 44, 1],
            [60, 26, 2],
            [42, 36, 3],
            [78, 32, 4],
            [24, 38, 5],
            [98, 56, 6],
          ].map(([x, y, i]) => (
            <circle key={i} className="leaf" cx={x} cy={y} r="3.4" fill={`var(--cat-${i}, var(--accent))`} style={{ animationDelay: `${i * 0.22}s` }} filter="url(#glow)" />
          ))}
        </svg>
        <p className="text-sm text-[var(--danger)]">Không tải được thế giới: {error}</p>
        {onRetry && (
          <button type="button" className="btn" onClick={onRetry}>
            Thử lại
          </button>
        )}
      </div>
    </div>
  );
}
