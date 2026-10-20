// Usage: node scripts/perf-chat-benchmark.cjs [url] [label]
// Benchmarks 3D frame time and main-thread Long Tasks (>50ms) during active chat streaming with LaTeX/Markdown.
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const targetUrl = process.argv[2] || process.env.TARGET_URL || 'http://localhost:5174/?vectors=150000&bench';
const label = process.argv[3] || process.env.LABEL || 'run';
const OUT_DIR = path.resolve(__dirname, '../docs/perf-shots/raw');
const REPORT_FILE = path.resolve(__dirname, '../docs/perf-chat-report.md');

const pct = (arr, p) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};

const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

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
      if (msg.type() === 'error' || msg.text().includes('bridge') || msg.text().includes('perf')) {
        console.log(`[Browser Console ${msg.type()}]:`, msg.text());
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

    console.log(`Starting frame timing recorder...`);
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

    // Stop recording and retrieve stats
    const results = await page.evaluate(() => {
      window.__recording = false;
      const frames = (window.__frameTimes || []).slice(10);
      const longTasks = window.__perfLongTasks || [];
      return { frames, longTasks };
    });

    const frames = results.frames;
    const longTasks = results.longTasks;

    const frameMedian = pct(frames, 0.5);
    const frameP95 = pct(frames, 0.95);
    const frameP99 = pct(frames, 0.99);
    const frameMax = frames.length ? Math.max(...frames) : 0;
    const frameMean = mean(frames);
    const fpsMedian = frameMedian > 0 ? 1000 / frameMedian : 0;
    const fpsMin = frameMax > 0 ? 1000 / frameMax : 0;

    const longTasksCount = longTasks.length;
    const maxLongTaskMs = longTasksCount ? Math.max(...longTasks.map((t) => t.duration)) : 0;

    const slaPassed = frameMedian <= 16.6 && frameP99 <= 33.3 && longTasksCount === 0;

    const summary = {
      label,
      timestamp: new Date().toISOString(),
      targetUrl,
      totalFrames: frames.length,
      frameTime: {
        medianMs: Number(frameMedian.toFixed(2)),
        meanMs: Number(frameMean.toFixed(2)),
        p95Ms: Number(frameP95.toFixed(2)),
        p99Ms: Number(frameP99.toFixed(2)),
        maxMs: Number(frameMax.toFixed(2)),
      },
      fps: {
        median: Number(fpsMedian.toFixed(1)),
        min: Number(fpsMin.toFixed(1)),
      },
      longTasks: {
        count: longTasksCount,
        maxDurationMs: Number(maxLongTaskMs.toFixed(2)),
        tasks: longTasks,
      },
      sla: {
        target: '60 FPS (Median <= 16.6ms, P99 <= 33.3ms, LongTasks = 0)',
        passed: slaPassed,
      },
    };

    console.log(`\n----------------- BENCHMARK RESULTS -----------------`);
    console.log(`Total Frames Measured: ${summary.totalFrames}`);
    console.log(`Frame Time Median:     ${summary.frameTime.medianMs} ms (~${summary.fps.median} FPS)`);
    console.log(`Frame Time p95:        ${summary.frameTime.p95Ms} ms`);
    console.log(`Frame Time p99:        ${summary.frameTime.p99Ms} ms`);
    console.log(`Max Frame Time:        ${summary.frameTime.maxMs} ms (Min ~${summary.fps.min} FPS)`);
    console.log(`Long Tasks (>50ms):    ${summary.longTasks.count} (Max: ${summary.longTasks.maxDurationMs} ms)`);
    console.log(`SLA Result:            ${slaPassed ? '✅ PASSED (60 FPS)' : '❌ FAILED (Lag Spikes Detected)'}`);
    console.log(`-----------------------------------------------------\n`);

    const jsonPath = path.join(OUT_DIR, `perf-chat-${label}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2), 'utf-8');
    console.log(`Saved detailed raw JSON report to: ${jsonPath}`);

    // Update docs/perf-chat-report.md
    const markdownContent = `# Báo Cáo So Sánh Hiệu Năng 3D + Chat Stream (${label})

- **Thời gian đo**: ${summary.timestamp}
- **URL**: \`${summary.targetUrl}\`
- **SLA Mục tiêu**: 60 FPS (Median $\\le 16.6\\text{ms}$, p99 $\\le 33.3\\text{ms}$, 0 Long Tasks $> 50\\text{ms}$)
- **Kết quả đánh giá**: **${slaPassed ? '✅ ĐẠT SLA 60 FPS' : '❌ CHƯA ĐẠT (Có Lag Spike)'}**

## 1. Bảng số liệu chi tiết

| Chỉ số | Kết quả đo được | Ngưỡng SLA 60 FPS | Trạng thái |
| :--- | :--- | :--- | :---: |
| **Frame Time Median** | **${summary.frameTime.medianMs} ms** (~${summary.fps.median} FPS) | $\\le 16.6\\text{ ms}$ | ${summary.frameTime.medianMs <= 16.6 ? '✅' : '❌'} |
| **Frame Time p95** | **${summary.frameTime.p95Ms} ms** | $\\le 25.0\\text{ ms}$ | ${summary.frameTime.p95Ms <= 25.0 ? '✅' : '❌'} |
| **Frame Time p99** | **${summary.frameTime.p99Ms} ms** | $\\le 33.3\\text{ ms}$ | ${summary.frameTime.p99Ms <= 33.3 ? '✅' : '❌'} |
| **Max Frame Time** | **${summary.frameTime.maxMs} ms** (~${summary.fps.min} FPS) | $\\le 40.0\\text{ ms}$ | ${summary.frameTime.maxMs <= 40.0 ? '✅' : '❌'} |
| **Long Tasks (>50ms)** | **${summary.longTasks.count} tasks** (Max: ${summary.longTasks.maxDurationMs} ms) | **0 tasks** | ${summary.longTasks.count === 0 ? '✅' : '❌'} |
| **Tổng số frame ghi nhận** | **${summary.totalFrames} frames** | - | - |

## 2. Danh sách Long Tasks (nếu có)
${
  summary.longTasks.count > 0
    ? summary.longTasks.tasks.slice(0, 15).map((t, i) => `- Task #${i + 1}: **${t.duration.toFixed(1)} ms** tại thời điểm ${t.startTime.toFixed(1)} ms`).join('\n')
    : '_Không có Long Task nào (>50ms). Main thread phản hồi liên tục mượt mà._'
}
`;

    fs.writeFileSync(REPORT_FILE, markdownContent, 'utf-8');
    console.log(`Updated performance report: ${REPORT_FILE}\n`);

    await browser.close();
  } catch (err) {
    console.error(`Benchmark failed with error:`, err);
    await browser.close();
    process.exit(1);
  }
})();
