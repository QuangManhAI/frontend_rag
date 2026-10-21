import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import { useUi, type QualityTier } from '../../../store/uiStore';

export interface PerfSnapshot {
  fps: number;
  meanFps: number;
  devFps: number;
  minFps: number;
  maxFps: number;
  frameTimeMs: number;
  meanFrameTimeMs: number;
  devFrameTimeMs: number;
  drawCalls: number;
  triangles: number;
  tier: QualityTier;
  dpr: number;
}

const WINDOW_SIZE = 120; // 2 seconds of history at 60 FPS

type PerfListener = (snap: PerfSnapshot) => void;
const listeners = new Set<PerfListener>();

export function subscribePerf(fn: PerfListener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

let latestSnapshot: PerfSnapshot | null = null;

export function getLatestPerfSnapshot(): PerfSnapshot | null {
  return latestSnapshot;
}

/**
 * Three.js scene component that collects frame statistics inside the Canvas render loop.
 * Renders null so it does not add any nodes to the Three.js scene graph.
 */
export function PerfSampler() {
  const history = useMemo(() => {
    return {
      deltas: new Float32Array(WINDOW_SIZE),
      head: 0,
      count: 0,
      lastLog: 0,
      lastRender: 0,
    };
  }, []);

  useFrame(({ gl }) => {
    const now = performance.now();
    if (history.lastRender === 0) {
      history.lastRender = now;
      return;
    }
    const dt = now - history.lastRender;
    history.lastRender = now;

    if (dt <= 0 || dt > 1000) return; // skip anomalous or backgrounded frame

    const idx = history.head % WINDOW_SIZE;
    history.deltas[idx] = dt;
    history.head++;
    if (history.count < WINDOW_SIZE) history.count++;

    // Calculate rolling statistics every 10 frames (~160ms) to prevent UI spam
    if (history.head % 10 === 0 && history.count > 10) {
      const n = history.count;
      let sumFt = 0;
      let sumFps = 0;
      let minFps = Infinity;
      let maxFps = 0;

      for (let i = 0; i < n; i++) {
        const ft = history.deltas[i];
        const fps = 1000 / ft;
        sumFt += ft;
        sumFps += fps;
        if (fps < minFps) minFps = fps;
        if (fps > maxFps) maxFps = fps;
      }

      const meanFt = sumFt / n;
      const meanFps = sumFps / n;

      let varFt = 0;
      let varFps = 0;
      for (let i = 0; i < n; i++) {
        const ft = history.deltas[i];
        const fps = 1000 / ft;
        varFt += (ft - meanFt) * (ft - meanFt);
        varFps += (fps - meanFps) * (fps - meanFps);
      }
      const devFt = Math.sqrt(varFt / n);
      const devFps = Math.sqrt(varFps / n);
      const instantFps = 1000 / dt;

      const snap: PerfSnapshot = {
        fps: instantFps,
        meanFps,
        devFps,
        minFps,
        maxFps,
        frameTimeMs: dt,
        meanFrameTimeMs: meanFt,
        devFrameTimeMs: devFt,
        drawCalls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        tier: useUi.getState().qualityTier,
        dpr: gl.getPixelRatio(),
      };

      latestSnapshot = snap;
      (window as unknown as { __rktPerf?: { getSnapshot: () => PerfSnapshot } }).__rktPerf = {
        getSnapshot: () => snap,
      };

      for (const fn of listeners) {
        fn(snap);
      }

      // Realtime console logging every 2 seconds
      if (now - history.lastLog > 2000) {
        history.lastLog = now;
        console.info(
          `[PERF REALTIME] FPS: ${instantFps.toFixed(1)} | Mean: ${meanFps.toFixed(1)} ± ${devFps.toFixed(1)} | Min: ${minFps.toFixed(1)} | FrameTime: ${meanFt.toFixed(1)}ms ± ${devFt.toFixed(1)}ms | Calls: ${gl.info.render.calls} | Tris: ${gl.info.render.triangles} | Tier: ${snap.tier} (DPR ${snap.dpr.toFixed(2)})`
        );
      }
    }
  });

  return null;
}

/**
 * Standard HTML DOM component displaying performance HUD overlay.
 * Must be rendered OUTSIDE <Canvas> in regular DOM.
 */
export function PerfHUD({ defaultOpen = true }: { defaultOpen?: boolean }) {
  const [visible, setVisible] = useState(() => defaultOpen || new URLSearchParams(window.location.search).has('perf'));
  const [snapshot, setSnapshot] = useState<PerfSnapshot | null>(() => latestSnapshot);
  const setQualityTier = useUi((s) => s.setQualityTier);
  const updateSettings = useUi((s) => s.updateSettings);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'P' || e.key === 'p')) setVisible((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    return subscribePerf((snap) => {
      setSnapshot(snap);
    });
  }, []);

  if (!visible || !snapshot) return null;

  const fpsColor =
    snapshot.fps >= 90
      ? 'text-cyan-400'
      : snapshot.fps >= 58
      ? 'text-emerald-400'
      : snapshot.fps >= 40
      ? 'text-amber-400'
      : 'text-rose-400';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 99999,
        pointerEvents: 'auto',
      }}
      className="bg-black/85 backdrop-blur-md border border-white/15 rounded-lg p-3 text-xs font-mono text-neutral-200 shadow-2xl select-none min-w-[240px]"
    >
      {/* Header with FPS and Mean */}
      <div className="flex items-baseline justify-between border-b border-white/10 pb-2 mb-2">
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold ${fpsColor}`}>
            {snapshot.fps.toFixed(1)}
          </span>
          <span className="text-[10px] text-neutral-400 font-sans tracking-wide uppercase">FPS</span>
        </div>
        <div className="text-right">
          <div className="text-neutral-300 font-semibold">
            Mean: {snapshot.meanFps.toFixed(1)} <span className="text-neutral-400 font-normal">± {snapshot.devFps.toFixed(1)}</span>
          </div>
          <div className="text-[10px] text-neutral-400">
            Min: {snapshot.minFps.toFixed(1)} · Max: {snapshot.maxFps.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Frame Time */}
      <div className="flex justify-between items-center py-0.5 text-neutral-300">
        <span className="text-neutral-400">Frame Time:</span>
        <span>
          {snapshot.meanFrameTimeMs.toFixed(1)} ms <span className="text-neutral-400">± {snapshot.devFrameTimeMs.toFixed(1)} ms</span>
        </span>
      </div>

      {/* Render stats */}
      <div className="flex justify-between items-center py-0.5 text-neutral-300">
        <span className="text-neutral-400">Draw Calls / Tris:</span>
        <span>
          {snapshot.drawCalls} / {(snapshot.triangles / 1000).toFixed(1)}k
        </span>
      </div>

      {/* Quality Tier & DPR */}
      <div className="flex justify-between items-center py-0.5 text-neutral-300">
        <span className="text-neutral-400">Tier / DPR:</span>
        <span>
          Tier {snapshot.tier} · DPR {snapshot.dpr.toFixed(2)}
        </span>
      </div>

      {/* Quick Tier Switcher Buttons */}
      <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between gap-1 text-[10px]">
        <span className="text-neutral-400 font-sans">Quick Tier:</span>
        <div className="flex gap-1">
          <button
            onClick={() => {
              updateSettings({ quality: 'high' });
              setQualityTier(0);
            }}
            className={`px-1.5 py-0.5 rounded ${snapshot.tier === 0 ? 'bg-indigo-600 text-white font-bold' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'}`}
            title="Tier 0: Full Bloom"
          >
            T0
          </button>
          <button
            onClick={() => {
              updateSettings({ quality: 'auto' });
              setQualityTier(1);
            }}
            className={`px-1.5 py-0.5 rounded ${snapshot.tier === 1 ? 'bg-indigo-600 text-white font-bold' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'}`}
            title="Tier 1: DPR 1.0 + Bloom"
          >
            T1
          </button>
          <button
            onClick={() => {
              updateSettings({ quality: 'low' });
              setQualityTier(2);
            }}
            className={`px-1.5 py-0.5 rounded ${snapshot.tier === 2 ? 'bg-indigo-600 text-white font-bold' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'}`}
            title="Tier 2: Light Bloom"
          >
            T2
          </button>
          <button
            onClick={() => {
              setQualityTier(3);
            }}
            className={`px-1.5 py-0.5 rounded ${snapshot.tier === 3 ? 'bg-emerald-600 text-white font-bold' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'}`}
            title="Tier 3: Max Speed (No PostFX - 100+ FPS)"
          >
            Max
          </button>
        </div>
      </div>
    </div>
  );
}
