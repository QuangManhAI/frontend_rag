import { test, expect } from '@playwright/test';
import { APP, seedAuth, seedSettings } from '../helpers';
const OUT = process.env.SHOT_DIR!;
test('look', async ({ page }) => {
  await seedSettings(page, { reduceMotion: true, glass: 'liquid' });
  await seedAuth(page);
  await page.goto(APP);
  await expect(page.getByTestId('category-legend')).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.mouse.move(300, 120);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${process.env.TAG}-overview.png` });
  await page.getByTestId('settings-toggle').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${process.env.TAG}-settings.png` });
});
