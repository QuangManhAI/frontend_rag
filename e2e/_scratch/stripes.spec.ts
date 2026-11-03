import { test, expect } from '@playwright/test';
import { APP, seedAuth, seedSettings } from '../helpers';
const OUT = process.env.SHOT_DIR!;
test('stripes', async ({ page }) => {
  await seedSettings(page, { reduceMotion: true, glass: 'liquid' });
  await seedAuth(page);
  await page.goto(APP);
  await expect(page.getByTestId('category-legend')).toBeVisible({ timeout: 30000 });
  await page.getByTestId('settings-toggle').click();
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.glass[data-refract]')].map((el) => ({ n: el.dataset.refract, ready: el.dataset.refractReady, bf: getComputedStyle(el).backdropFilter })));
  console.log(JSON.stringify(info, null, 1));
  console.log(await page.locator('[data-testid=liquid-filters] filter').count());
  await page.evaluate(() => {
    const s = document.createElement('div');
    s.style.cssText = 'position:fixed;inset:0;z-index:5;pointer-events:none;background:repeating-linear-gradient(45deg,#fff 0 10px,#e0245e 10px 20px,#2a6cff 20px 30px,#000 30px 40px)';
    document.querySelector('.fixed.inset-0')?.append(s);
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${process.env.TAG}-stripes.png` });
});
