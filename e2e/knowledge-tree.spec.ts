import { expect, test, type Page } from '@playwright/test';

// Small world + no bloom keeps software-GL CI runs fast; the flow is identical.
const APP = '/?vectors=8000&nofx';

async function openWorld(page: Page) {
  await page.goto(APP);
  await expect(page.getByTestId('category-legend')).toBeVisible({ timeout: 30_000 });
}

async function ask(page: Page, question: string) {
  await page.getByLabel('Câu hỏi').fill(question);
  await page.getByLabel('Câu hỏi').press('Enter');
}

async function askAndFinish(page: Page) {
  await ask(page, 'LoRA giúp fine-tune transformer hiệu quả như thế nào?');
  await expect(page.getByTestId('pipeline-status')).toHaveAttribute('data-visual-phase', 'done', { timeout: 60_000 });
}

test('a. world loads and the legend lists every category', async ({ page }) => {
  await openWorld(page);
  await expect(page.locator('[data-testid="category-legend"] [data-category]')).toHaveCount(10);
  await expect(page.locator('canvas')).toBeVisible();
});

test('b. dark-only layout: year slider, labels and crawl live in the settings', async ({ page }) => {
  await openWorld(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByTestId('theme-toggle')).toHaveCount(0);
  await expect(page.getByTestId('nav-overview')).toHaveCount(0);
  // Branch labels are off until enabled in the settings; the year slider and crawl panel live there.
  await expect(page.locator('.label3d')).toHaveCount(0);
  await expect(page.getByTestId('year-panel')).toHaveCount(0);
  await expect(page.getByTestId('crawl-hud')).toHaveCount(0);
  await page.getByTestId('settings-toggle').click();
  const settings = page.getByTestId('settings-panel');
  await expect(settings.getByTestId('year-panel')).toBeVisible();
  await expect(settings.getByTestId('crawl-hud')).toBeVisible();
  await page.getByLabel('Hiện nhãn chủ đề trên nhánh').check();
  await expect(page.locator('.label3d').first()).toBeAttached();
});

test('c. a question streams an answer, frames the best result, then pulls back and spotlights the ranks', async ({ page }) => {
  await openWorld(page);
  await ask(page, 'LoRA giúp fine-tune transformer hiệu quả như thế nào?');
  const status = page.getByTestId('pipeline-status');
  await expect(status).toHaveAttribute('data-visual-phase', /embedding|flying/);
  // The best result is framed with its card while "found"…
  await expect(page.getByTestId('result-card')).toBeVisible({ timeout: 60_000 });
  const answer = page.getByTestId('assistant-message').last().locator('.md');
  await expect(answer).toBeVisible({ timeout: 60_000 });
  const firstLen = (await answer.innerText()).length;
  await expect.poll(async () => (await answer.innerText()).length, { timeout: 20_000 }).toBeGreaterThan(firstLen);
  await expect(status).toHaveAttribute('data-visual-phase', 'done', { timeout: 60_000 });
  await expect(status.getByText('Xong')).toBeVisible();
  // …then the view pulls back: the card closes, every rank (incl. #1) gets a badge, the canopy dims.
  await expect(page.getByTestId('result-card')).toHaveCount(0);
  await expect(page.getByLabel(/^Kết quả hạng 1:/)).toBeAttached();
  const view = await page.evaluate(() => {
    const g = globalThis as unknown as { __rkt: { ui: { getState: () => { cameraMode: string } }; fx: { getState: () => { dim: number } } } };
    return { mode: g.__rkt.ui.getState().cameraMode, dim: g.__rkt.fx.getState().dim };
  });
  expect(view).toEqual({ mode: 'overview', dim: 1 });
});

test('d. a verified citation opens the PaperPanel with the "used" band', async ({ page }) => {
  await openWorld(page);
  await askAndFinish(page);
  const chip = page.locator('[data-testid="assistant-message"] .cite-chip[data-status="verified"]').first();
  const paperId = await chip.getAttribute('data-paper-id');
  await chip.click();
  const panel = page.getByTestId('paper-panel');
  await expect(panel).toHaveAttribute('data-paper-id', paperId ?? '');
  await expect(panel).toHaveAttribute('data-case', 'grounded');
  await expect(panel.getByText('Đã dùng cho câu trả lời').first()).toBeVisible();
  await expect(page.getByTestId('result-card')).toHaveAttribute('data-paper-id', paperId ?? '');
});

test('e. an unverified citation opens the PaperPanel with a warning', async ({ page }) => {
  await openWorld(page);
  await askAndFinish(page);
  await page.locator('[data-testid="assistant-message"] .cite-chip[data-status="unverified"]').first().click();
  const panel = page.getByTestId('paper-panel');
  await expect(panel).toHaveAttribute('data-case', 'unverified');
  await expect(panel.getByRole('alert')).toContainText('LLM trích dẫn một bài không có trong ngữ cảnh đã truy xuất');
});

test('f. top_k = 0 is rejected by validation', async ({ page }) => {
  await openWorld(page);
  await page.getByTestId('settings-toggle').click();
  const input = page.getByTestId('setting-top_k');
  await input.fill('0');
  await expect(page.getByTestId('settings-panel').getByRole('alert')).toContainText('top_k');
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  const stored = await page.evaluate(() => (globalThis as unknown as { __rkt: { ui: { getState: () => { settings: { top_k: number } } } } }).__rkt.ui.getState().settings.top_k);
  expect(stored).toBe(5);
});
