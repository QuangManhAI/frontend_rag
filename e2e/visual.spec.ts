import { fileURLToPath } from 'node:url';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { APP, askAndFinish, openWorld, seedAuth, seedReducedMotion } from './helpers';

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
