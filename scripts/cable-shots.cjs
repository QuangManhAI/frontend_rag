// Screenshots for the knowledge cables (Prompt 14.1): overview + "Dưới đất", dark + light, while
// the mock crawler runs. Usage: LABEL=before node scripts/cable-shots.cjs (needs `npm run preview`).
const { chromium } = require('playwright');
const LABEL = process.env.LABEL || 'after';
const OUT = 'docs/screenshots/';
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  for (const theme of ['dark', 'light']) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: theme });
    await p.goto('http://localhost:4173/?bench');
    await p.waitForFunction(() => globalThis.__rkt && __rkt.world.getState().vectors);
    await p.evaluate((t) => __rkt.ui.getState().setTheme(t), theme);
    await p.evaluate(() => __rkt.crawl.getState().setMock({ running: true, ratePerMin: 3000 }));
    await p.waitForTimeout(7000);
    await p.screenshot({ path: `${OUT}${LABEL}-${theme}-overview.png` });
    await p.evaluate(() => __rkt.ui.getState().setCameraMode('ground'));
    await p.waitForTimeout(3500);
    await p.screenshot({ path: `${OUT}${LABEL}-${theme}-ground.png` });
    await p.close();
  }
  await b.close();
})();
