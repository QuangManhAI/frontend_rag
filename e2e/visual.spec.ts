import { fileURLToPath } from 'node:url';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { APP, askAndFinish, openWorld, seedAuth, seedReducedMotion, seedSettings } from './helpers';

/**
 * UI screenshots used as the visual baseline for the design-system migration
 * (docs/FE3d_prompt_v2.md, P15). Each prompt runs this with its own tolerance:
 *   VISUAL_THRESHOLD=0.015 npm run test:visual
 * Baselines are only refreshed (--update-snapshots) after a human reviewed the diff.
 */
const THRESHOLD = Number(process.env.VISUAL_THRESHOLD ?? 0);

/**
 * Text rasterisation flips up to ~430 anti-aliased glyph pixels between identical runs (GPU or CPU),
 * so "no visual change" means at most NOISE_PX differing pixels (largest flake seen: 428; smallest real change seen — defining --ink-faint in HistoryDrawer: 907).
 */
const NOISE_PX = 600;

// Rarely (~1 in 9 runs) a DOM label anchored to the 3D projection lands a frame late; a real
// change fails both attempts, a flake passes the retry.
test.describe.configure({ retries: 1 });

/** Hides the WebGL canvas and PerfHUD during the shot (a mask would paint over the whole UI). */
const STYLE = fileURLToPath(new URL('./visual.css', import.meta.url));

/** Live numbers are not pixel-stable; the UI around them is what we compare. */
function volatile(page: Page): Locator[] {
  return [page.getByTestId('pipeline-status')]; // measured ms timings
}

async function shoot(page: Page, name: string): Promise<void> {
  // Vietnamese glyphs live in a separate webfont subset that may start loading after layout.
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await document.fonts.ready;
  });
  await expect(page).toHaveScreenshot(`${name}.png`, {
    animations: 'disabled',
    caret: 'hide',
    mask: volatile(page),
    stylePath: STYLE,
    ...(THRESHOLD > 0 ? { maxDiffPixelRatio: THRESHOLD } : { maxDiffPixels: NOISE_PX }),
  });
}

test.describe('signed in', () => {
  test.beforeEach(async ({ page }) => {
    await seedReducedMotion(page);
    await seedAuth(page);
  });

  test('01 overview with chat', async ({ page }) => {
    await openWorld(page);
    await shoot(page, '01-overview');
  });

  test('02 chat collapsed', async ({ page }) => {
    await openWorld(page);
    await page.getByLabel('Thu gọn chat').click();
    await expect(page.getByLabel('Mở chat')).toBeVisible();
    await shoot(page, '02-chat-collapsed');
  });

  test('03 answer done', async ({ page }) => {
    await openWorld(page);
    await askAndFinish(page);
    await shoot(page, '03-answer-done');
  });

  test('04 paper panel (verified citation)', async ({ page }) => {
    await openWorld(page);
    await askAndFinish(page);
    await page.locator('[data-testid="assistant-message"] .cite-chip[data-status="verified"]').first().click();
    await expect(page.getByTestId('paper-panel')).toHaveAttribute('data-case', 'grounded');
    await shoot(page, '04-paper-verified');
  });

  test('05 settings', async ({ page }) => {
    await openWorld(page);
    await page.getByTestId('settings-toggle').click();
    await expect(page.getByTestId('settings-panel')).toBeVisible();
    await shoot(page, '05-settings');
  });

  test('06 history drawer', async ({ page }) => {
    await openWorld(page);
    await page.getByLabel('Lịch sử trò chuyện').click();
    await expect(page.getByText('Đoạn chat mới').first()).toBeVisible();
    await shoot(page, '06-history-drawer');
  });

  test('08 mobile bottom sheet', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openWorld(page);
    await shoot(page, '08-mobile-sheet');
  });
});

test.describe('signed out', () => {
  test.beforeEach(async ({ page }) => {
    await seedReducedMotion(page);
  });

  test('07 auth form', async ({ page }) => {
    await page.goto(APP);
    await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible({ timeout: 30_000 });
    await shoot(page, '07-auth');
  });
});

/** Glass never stacks on glass (FE_DESIGN_SYSTEM §4.1): count live backdrop-filter layers per state. */
async function backdropLayers(page: Page): Promise<number> {
  return page.evaluate(() => {
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
    };
    const active = (v: string) => v !== '' && v !== 'none';
    let count = 0;
    for (const el of document.querySelectorAll('body *')) {
      if (!visible(el)) continue;
      if (active(getComputedStyle(el).backdropFilter)) count++;
      if (active(getComputedStyle(el, '::before').backdropFilter)) count++;
    }
    return count;
  });
}

test('backdrop-filter layers per state', async ({ page }) => {
  await seedReducedMotion(page);
  await page.goto(APP);
  await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible({ timeout: 30_000 });
  const auth = await backdropLayers(page);

  await seedAuth(page);
  await openWorld(page);
  await page.getByLabel('Lịch sử trò chuyện').click();
  const history = await backdropLayers(page);
  await page.getByLabel('Đóng lịch sử').click();

  await askAndFinish(page);
  const answer = await backdropLayers(page);

  console.log(`backdrop-filter layers — auth: ${auth} · history: ${history} · answer: ${answer}`);
  expect(answer).toBeGreaterThan(0);
});

/** Liquid Glass level 2+ (P21): specular highlight on, light at rest above the screen (reduced motion). */
test.describe('liquid glass', () => {
  test.beforeEach(async ({ page }) => {
    await seedReducedMotion(page, { glass: 'liquid' });
    await seedAuth(page);
  });

  test('01 overview (lg2)', async ({ page }) => {
    await openWorld(page);
    await expect(page.locator('html')).toHaveAttribute('data-lg-level', /^[23]$/);
    await shoot(page, '01-overview-lg2');
  });

  test('02 chat collapsed (lg2)', async ({ page }) => {
    await openWorld(page);
    await page.getByLabel('Thu gọn chat').click();
    await expect(page.getByLabel('Mở chat')).toBeVisible();
    await shoot(page, '02-chat-collapsed-lg2');
  });

  test('05 settings (lg2)', async ({ page }) => {
    await openWorld(page);
    await page.getByTestId('settings-toggle').click();
    await expect(page.getByTestId('settings-panel')).toBeVisible();
    await shoot(page, '05-settings-lg2');
  });
});

test.describe('glass level behaviour', () => {
  test('the setting drives data-lg-level and level 0 drops every backdrop-filter', async ({ page }) => {
    await seedSettings(page, {});
    await seedAuth(page);
    await openWorld(page);
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-lg-level', /^[23]$/); // auto on Chromium
    await page.getByTestId('settings-toggle').click();
    await page.getByTestId('glass-frosted').click();
    await expect(html).toHaveAttribute('data-lg-level', '1');
    await page.getByTestId('glass-off').click();
    await expect(html).toHaveAttribute('data-lg-level', '0');
    expect(await backdropLayers(page)).toBe(0);
    // Persisted for the next visit (a reload would re-run the seeding init script).
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('rkt.settings') ?? '{}').glass);
    expect(stored).toBe('off');
  });

  test('the light follows the pointer, and stays put with reduced motion', async ({ page }) => {
    await seedSettings(page, { glass: 'liquid' });
    await seedAuth(page);
    await openWorld(page);
    const light = () => page.getByTestId('chat-dock').evaluate((el) => Number((el as HTMLElement).style.getPropertyValue('--lg-light-x') || 0));
    await page.mouse.move(1430, 450);
    await expect.poll(light).toBeGreaterThan(0.9);

    await page.getByTestId('settings-toggle').click();
    await page.getByLabel('Giảm chuyển động').check();
    await expect.poll(light).toBe(0);
    await page.mouse.move(10, 450);
    await page.waitForTimeout(300);
    expect(await light()).toBe(0);
  });
});

/**
 * Glass must blur what is behind it (regression guard for P19→P22): a high-contrast stripe layer is put
 * between the 3D scene and the UI, so a surface that stops sampling its backdrop shows crisp stripes.
 * The liquid shot also shows the level-3 refraction band along the chat column's edge.
 */
test.describe('glass backdrop', () => {
  for (const glass of ['frosted', 'liquid'] as const) {
    test(`chat column over stripes (${glass})`, async ({ page }) => {
      await seedReducedMotion(page, { glass });
      await seedAuth(page);
      await openWorld(page);
      if (glass === 'liquid') await expect(page.locator('html')).toHaveAttribute('data-lg-refract', 'ready', { timeout: 15_000 });
      await page.evaluate(() => {
        const stripes = document.createElement('div');
        stripes.style.cssText = 'position:fixed;inset:0;z-index:15;pointer-events:none;background:repeating-linear-gradient(90deg,#fff 0 6px,#e0245e 6px 12px,#000 12px 18px)';
        document.querySelector('[data-testid=chat-dock]')?.closest('.fixed')?.append(stripes);
      });
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`glass-backdrop-${glass}.png`, {
        clip: { x: 0, y: 60, width: 480, height: 300 },
        animations: 'disabled',
        caret: 'hide',
        stylePath: STYLE,
        maxDiffPixels: NOISE_PX,
      });
    });
  }

  test('outside Chromium: level 2, no refraction filter, clean console', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.addInitScript(() => Object.defineProperty(navigator, 'userAgentData', { value: { brands: [{ brand: 'Firefox', version: '140' }] } }));
    await seedReducedMotion(page, { glass: 'liquid' });
    await seedAuth(page);
    await openWorld(page);
    await expect(page.locator('html')).toHaveAttribute('data-lg-level', '2');
    await page.waitForTimeout(1000);
    await expect(page.getByTestId('liquid-filters')).toHaveCount(0);
    const filter = await page.getByTestId('chat-dock').evaluate((el) => getComputedStyle(el).backdropFilter);
    expect(filter).not.toContain('url(');
    expect(errors.filter((e) => /filter|refract|svg/i.test(e))).toEqual([]);
  });

  test('resizing the window keeps at most 4 refraction maps', async ({ page }) => {
    await seedReducedMotion(page, { glass: 'liquid' });
    await seedAuth(page);
    await openWorld(page);
    await expect(page.locator('html')).toHaveAttribute('data-lg-refract', 'ready', { timeout: 15_000 });
    for (let i = 0; i < 10; i++) {
      await page.setViewportSize({ width: 1200 + i * 20, height: 800 + i * 10 });
      await page.waitForTimeout(450); // 150 ms debounce + idle build
    }
    const size = await page.evaluate(async () => (await import('/src/components/ui/LiquidFilters.tsx')).refractionCacheSize());
    expect(size).toBeLessThanOrEqual(4);
    const href = await page.locator('#lg-refract-chat feImage').getAttribute('href');
    expect(href?.startsWith('data:image/png')).toBe(true);
  });
});
