// Usage: node scripts/perf-measure.cjs <label> [runs]  — needs `npm run build && npx vite preview --port 4173` running.
// Env: QS='&legacyfx' (old GPU settings), SWIFT=1 (SwiftShader), SYNC=1 (readPixels sync each frame), QUALITY=high|low|auto, THEMES=dark,light, FRAMES, SETTLE, NOSHOTS=1.
const { chromium } = require('@playwright/test');
const fs = require('fs');
const label = process.argv[2] || 'run';
const runs = Number(process.argv[3] || 3);
const OUT = __dirname + '/../docs/perf-shots/raw/perf-' + label + '.json';
const SHOTS = __dirname + '/../docs/perf-shots/raw/';
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const VIEW = (([w, h]) => ({ width: +w, height: +h }))((process.env.VIEW || '1440x900').split('x'));
const mean = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);

async function prepare(page, theme, reduceMotion) {
  await page.goto('http://localhost:4173/?vectors=150000&bench' + (process.env.QS || ''));
  await page.waitForFunction(() => globalThis.__rkt && __rkt.world.getState().status === 'ready' && globalThis.__rktGl, null, { timeout: 90000 });
  await page.evaluate(([t, rm, q]) => { __rkt.ui.getState().setTheme(t); __rkt.ui.getState().updateSettings({ reduceMotion: rm, quality: q }); }, [theme, reduceMotion, process.env.QUALITY || 'high']);
  await page.waitForTimeout(2500);
  await page.evaluate(() => __rkt.rag.getState().send('LoRA cho transformer'));
  await page.waitForTimeout(1200);
  await page.evaluate(() => __rkt.rag.getState().skipAnimation());
  await page.waitForFunction(() => __rkt.rag.getState().visualPhase === 'done', null, { timeout: 60000 });
}

(async () => {
  const browser = await chromium.launch({ args: process.env.SWIFT ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-vsync', '--disable-frame-rate-limit'] : ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
  const report = {};
  for (const theme of (process.env.THEMES || 'dark,light').split(',')) {
    // Screenshots: frozen motion so before/after are comparable.
    if (!process.env.NOSHOTS) {
      const page = await browser.newPage({ viewport: VIEW, colorScheme: theme });
      await prepare(page, theme, true);
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `${SHOTS}${label}-${theme}-focus.png` });
      await page.evaluate(() => { __rkt.ui.setState({ panelPaperId: null, focusedPaperId: null }); __rkt.ui.getState().setCameraMode('overview'); });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `${SHOTS}${label}-${theme}-overview.png` });
      await page.close();
    }
    const r = { frameMedian: [], frameP95: [], calls: [], pickMean: [], pickP95: [], diffMean: [], diffMax: [] };
    for (let k = 0; k < runs; k++) {
      const page = await browser.newPage({ viewport: VIEW, colorScheme: theme });
      await prepare(page, theme, false);
      await page.evaluate(() => { __rkt.ui.setState({ panelPaperId: null, focusedPaperId: null }); __rkt.ui.getState().setCameraMode('overview'); });
      await page.waitForTimeout(Number(process.env.SETTLE || 3000));
      await page.evaluate((n) => { globalThis.__FRAMES = n; }, Number(process.env.FRAMES || 620));
      // SYNC=1: read back one pixel every frame so the GPU must finish the previous frame
      // (needed for SwiftShader, where rAF does not wait for the software GPU).
      await page.evaluate((s) => { globalThis.__SYNC = s; }, !!process.env.SYNC);
      const frames = await page.evaluate(() => new Promise((res) => {
        const t = []; let last = performance.now();
        const gl = globalThis.__rktGl.getContext(); const px = new Uint8Array(4);
        function f() { if (globalThis.__SYNC) gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const now = performance.now(); t.push(now - last); last = now; if (t.length < (globalThis.__FRAMES || 620)) requestAnimationFrame(f); else res(t.slice(20)); }
        requestAnimationFrame(f);
      }));
      const calls = await page.evaluate(() => new Promise((res) => {
        const g = __rktGl; g.info.autoReset = false; g.info.reset(); let n = 0;
        function f() { if (++n <= 10) requestAnimationFrame(f); else { const c = g.info.render.calls / 10; g.info.autoReset = true; res(c); } }
        requestAnimationFrame(f);
      }));
      // Hover picks over the canopy (same 60 points every run), spaced beyond the 30 ms throttle.
      await page.evaluate(() => { __rkt.perf.pick = []; __rkt.perf.diffStates = []; });
      for (let i = 0; i < 60; i++) {
        await page.mouse.move(720 + (i % 10) * 50, 140 + Math.floor(i / 10) * 55);
        await page.waitForTimeout(40);
      }
      // Filter toggles → diffStates.
      await page.evaluate(async () => {
        const w = __rkt.world.getState();
        for (let i = 0; i < 20; i++) {
          __rkt.ui.getState().setHighlights(i % 2 ? null : w.vectorsByCategory.get(i % 10), { kind: 'category', id: i % 10, label: 'x' });
          await new Promise((r) => requestAnimationFrame(() => r()));
        }
        __rkt.ui.getState().setHighlights(null, null);
      });
      const perf = await page.evaluate(() => ({ pick: __rkt.perf.pick || [], diff: __rkt.perf.diffStates || [] }));
      r.frameMedian.push(pct(frames, 0.5)); r.frameP95.push(pct(frames, 0.95)); r.calls.push(calls);
      r.pickMean.push(mean(perf.pick)); r.pickP95.push(pct(perf.pick, 0.95));
      r.diffMean.push(mean(perf.diff)); r.diffMax.push(Math.max(...perf.diff));
      const tierNow = await page.evaluate(() => __rkt.ui.getState().qualityTier);
      console.log(theme, `tier ${tierNow}`, `run ${k + 1}: frame median ${pct(frames, 0.5).toFixed(2)} p95 ${pct(frames, 0.95).toFixed(2)} ms | calls ${calls} | pick ${mean(perf.pick).toFixed(3)} ms (n=${perf.pick.length}) | diff ${mean(perf.diff).toFixed(3)} ms (n=${perf.diff.length})`);
      await page.close();
    }
    const med = (a) => pct(a, 0.5);
    report[theme] = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, +med(v).toFixed(3)]));
    console.log(theme, 'MEDIAN OF RUNS', JSON.stringify(report[theme]));
  }
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  await browser.close();
})();
