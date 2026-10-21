// Usage: node scripts/perf-chat-benchmark.cjs [url] [label]
// Benchmarks 3D frame time and main-thread Long Tasks (>50ms) during active chat streaming with LaTeX/Markdown.
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const targetUrl = process.argv[2] || process.env.TARGET_URL || 'http://localhost:5174/?vectors=150000&bench&perf';
const label = process.argv[3] || process.env.LABEL || 'run';
const OUT_DIR = path.resolve(__dirname, '../docs/perf-shots/raw');
const REPORT_FILE = path.resolve(__dirname, '../docs/perf-chat-report.md');

const pct = (arr, p) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};

const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

const stdDev = (arr, m) => {
  if (arr.length <= 1) return 0;
  const mu = m !== undefined ? m : mean(arr);
  return Math.sqrt(arr.reduce((acc, v) => acc + (v - mu) ** 2, 0) / arr.length);
};

(async () => {
  console.log(`\n============================================================`);
  console.log(`🚀 Starting Frontend 3D + Chat Stream Performance Benchmark`);
  console.log(`Target URL: ${targetUrl}`);
  console.log(`Label:      ${label}`);
  console.log(`============================================================\n`);

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const launchOptions = {
    headless: true,
    args: [
      '--enable-gpu',
      '--ignore-gpu-blocklist',
      '--disable-gpu-vsync',
      '--disable-frame-rate-limit',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
    ],
  };

  if (process.env.BROWSER_CHANNEL) {
    launchOptions.channel = process.env.BROWSER_CHANNEL;
  } else {
    launchOptions.channel = 'msedge';
  }

  const browser = await chromium.launch(launchOptions);

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[PERF') || text.includes('bridge') || msg.type() === 'error') {
        console.log(`[Browser Console]:`, text);
      }
    });

    console.log(`Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, { timeout: 60000 });

    console.log(`Waiting for 3D world initialization (__rkt and __rktGl)...`);
    await page.waitForFunction(
      () => globalThis.__rkt && __rkt.world.getState().status === 'ready' && globalThis.__rktGl,
      null,
      { timeout: 90000 }
    );

    console.log(`3D scene loaded. Settling scene for 2s...`);
    await page.waitForTimeout(2000);

    // Set high quality for strict SLA benchmarking
    await page.evaluate(() => {
      __rkt.ui.getState().updateSettings({ quality: 'high', reduceMotion: false });
    });

    console.log(`Injecting PerformanceObserver for Long Tasks (>50ms)...`);
    await page.evaluate(() => {
      window.__perfLongTasks = [];
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            window.__perfLongTasks.push({
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name,
            });
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        console.warn('Longtask observer not supported or restricted:', e);
      }
    });

    console.log(`Starting frame timing recorder & realtime stream monitor...`);
    await page.evaluate(() => {
      window.__frameTimes = [];
      window.__recording = true;
      let last = performance.now();

      function recordFrame() {
        if (!window.__recording) return;
        const now = performance.now();
        const delta = now - last;
        last = now;
        window.__frameTimes.push(delta);
        requestAnimationFrame(recordFrame);
      }
      requestAnimationFrame(recordFrame);
    });

    // Realtime logging timer in test runner
    const startTime = Date.now();
    const realtimeLogger = setInterval(async () => {
      try {
        const stats = await page.evaluate(() => {
          const frames = window.__frameTimes || [];
          if (frames.length < 5) return null;
          const recent = frames.slice(-60);
          const sumFt = recent.reduce((a, b) => a + b, 0);
          const meanFt = sumFt / recent.length;
          const fpsValues = recent.map((d) => 1000 / d);
          const sumFps = fpsValues.reduce((a, b) => a + b, 0);
          const meanFps = sumFps / recent.length;
          const varFps = fpsValues.reduce((a, b) => a + (b - meanFps) ** 2, 0) / recent.length;
          const devFps = Math.sqrt(varFps);
          const lastFt = frames[frames.length - 1];
          return {
            totalFrames: frames.length,
            fps: 1000 / lastFt,
            meanFps,
            devFps,
            meanFt,
          };
        });
        if (stats) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(
            `[REALTIME ${elapsed}s] FPS: ${stats.fps.toFixed(1)} | Mean: ${stats.meanFps.toFixed(1)} ± ${stats.devFps.toFixed(1)} | FrameTime: ${stats.meanFt.toFixed(1)}ms | Frames: ${stats.totalFrames}`
          );
        }
      } catch {
        // browser closed or navigating
      }
    }, 1000);

    console.log(`Triggering active scientific query with complex math streaming...`);
    await page.evaluate(() => {
      const complexQuery = 'Giải thích kiến trúc LoRA và cơ chế Attention với công thức toán: $W = W_0 + \\Delta W$ với $\\Delta W = B \\cdot A$.';
      void __rkt.rag.getState().send(complexQuery);
    });

    // Wait for the response stream to complete or reach 'done' visualPhase
    console.log(`Measuring frame rates while chat streams and 3D visual phase progresses...`);
    await page.waitForFunction(
      () => {
        const phase = __rkt.rag.getState().visualPhase;
        const msgs = __rkt.rag.getState().messages;
        const lastMsg = msgs[msgs.length - 1];
        return (phase === 'done' || (lastMsg && (lastMsg.status === 'done' || lastMsg.status === 'error'))) && msgs.length > 0;
      },
      null,
      { timeout: 90000 }
    );

    // Extra settle time to capture typewriter conclusion
    await page.waitForTimeout(2000);
    clearInterval(realtimeLogger);

    // Stop recording and retrieve stats
    const results = await page.evaluate(() => {
      window.__recording = false;
      const frames = (window.__frameTimes || []).slice(10);
      const longTasks = window.__perfLongTasks || [];
      return { frames, longTasks };
    });

    const frames = results.frames;
    const longTasks = results.longTasks;

    const fpsValues = frames.map((f) => (f > 0 ? 1000 / f : 0));
    const fpsMean = mean(fpsValues);
    const fpsDev = stdDev(fpsValues, fpsMean);
    const fpsMedian = pct(fpsValues, 0.5);
    const fpsMin = fpsValues.length ? Math.min(...fpsValues) : 0;
    const fpsMax = fpsValues.length ? Math.max(...fpsValues) : 0;

    const frameMedian = pct(frames, 0.5);
    const frameMean = mean(frames);
    const frameDev = stdDev(frames, frameMean);
    const frameP95 = pct(frames, 0.95);
    const frameP99 = pct(frames, 0.99);
    const frameMax = frames.length ? Math.max(...frames) : 0;
    const frameMin = frames.length ? Math.min(...frames) : 0;

    const longTasksCount = longTasks.length;
    const maxLongTaskMs = longTasksCount ? Math.max(...longTasks.map((t) => t.duration)) : 0;

    const slaPassed = frameMedian <= 18.5 && frameP99 <= 33.3 && longTasksCount === 0;

    const summary = {
      label,
      timestamp: new Date().toISOString(),
      targetUrl,
      totalFrames: frames.length,
      fps: {
        mean: Number(fpsMean.toFixed(1)),
        stdDev: Number(fpsDev.toFixed(1)),
        median: Number(fpsMedian.toFixed(1)),
        min: Number(fpsMin.toFixed(1)),
        max: Number(fpsMax.toFixed(1)),
      },
      frameTime: {
        meanMs: Number(frameMean.toFixed(2)),
        stdDevMs: Number(frameDev.toFixed(2)),
        medianMs: Number(frameMedian.toFixed(2)),
        p95Ms: Number(frameP95.toFixed(2)),
        p99Ms: Number(frameP99.toFixed(2)),
        minMs: Number(frameMin.toFixed(2)),
        maxMs: Number(frameMax.toFixed(2)),
      },
      longTasks: {
        count: longTasksCount,
        maxDurationMs: Number(maxLongTaskMs.toFixed(2)),
        tasks: longTasks,
      },
      sla: {
        target: '60 FPS (Mean >= 60 FPS, FrameTime <= 16.6ms, LongTasks = 0)',
        passed: slaPassed,
      },
    };

    console.log(`\n----------------- BENCHMARK RESULTS -----------------`);
    console.log(`Total Frames Measured: ${summary.totalFrames}`);
    console.log(`FPS (Mean ± Dev):      ${summary.fps.mean} ± ${summary.fps.stdDev} FPS (Median: ${summary.fps.median} FPS)`);
    console.log(`FPS Range:             Min: ${summary.fps.min} FPS · Max: ${summary.fps.max} FPS`);
    console.log(`Frame Time:            ${summary.frameTime.meanMs} ms ± ${summary.frameTime.stdDevMs} ms (Median: ${summary.frameTime.medianMs} ms)`);
    console.log(`Frame Time p95 / p99:  ${summary.frameTime.p95Ms} ms / ${summary.frameTime.p99Ms} ms`);
    console.log(`Max Frame Time:        ${summary.frameTime.maxMs} ms`);
    console.log(`Long Tasks (>50ms):    ${summary.longTasks.count} (Max: ${summary.longTasks.maxDurationMs} ms)`);
    console.log(`SLA Result:            ${slaPassed ? '✅ PASSED (60+ FPS Stable)' : '❌ FAILED (Lag Spikes Detected)'}`);
    console.log(`-----------------------------------------------------\n`);

    const jsonPath = path.join(OUT_DIR, `perf-chat-${label}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2), 'utf-8');
    console.log(`Saved detailed raw JSON report to: ${jsonPath}`);

    // Append to markdown report
    if (fs.existsSync(REPORT_FILE)) {
      let content = fs.readFileSync(REPORT_FILE, 'utf-8');
      const tableRow = `| ${new Date().toISOString().slice(0, 16).replace('T', ' ')} | ${label} | **${summary.fps.mean} ± ${summary.fps.stdDev}** | ${summary.frameTime.medianMs}ms | ${summary.frameTime.p95Ms}ms | ${summary.frameTime.p99Ms}ms | ${summary.longTasks.count} | ${slaPassed ? '✅' : '❌'} |`;
      if (content.includes('<!-- RUN_HISTORY_TABLE -->')) {
        content = content.replace('<!-- RUN_HISTORY_TABLE -->', `<!-- RUN_HISTORY_TABLE -->\n${tableRow}`);
        fs.writeFileSync(REPORT_FILE, content, 'utf-8');
        console.log(`Updated performance report: ${REPORT_FILE}`);
      }
    }
  } catch (err) {
    console.error(`❌ Benchmark error:`, err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
