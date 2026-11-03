import { test, expect } from '@playwright/test';
import { APP, seedSettings } from '../helpers';
const OUT = process.env.SHOT_DIR!;
test.use({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: Number(process.env.DPR ?? 1) });
test('signed out', async ({ page }) => {
  await seedSettings(page, { glass: 'liquid' });
  await page.goto(APP);
  await expect(page.getByTestId('category-legend')).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(3000);
  const info = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-testid=chat-dock]')!;
    const f = document.querySelector('#lg-refract-chat');
    return { w: el.offsetWidth, h: el.offsetHeight, fw: f?.getAttribute('width'), fh: f?.getAttribute('height'), lit: el.dataset.lit, ready: el.dataset.refractReady, bf: getComputedStyle(el).backdropFilter, anim: getComputedStyle(el).animationName, tr: getComputedStyle(el).transform };
  });
  console.log(JSON.stringify(info));
  await page.screenshot({ path: `${OUT}/so-${process.env.TAG}.png` });
});
