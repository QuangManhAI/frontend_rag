import { expect, type Page } from '@playwright/test';

// Small world + no bloom keeps software-GL CI runs fast; the flow is identical.
export const APP = '/?vectors=8000&nofx';

export const QUESTION = 'LoRA giúp fine-tune transformer hiệu quả như thế nào?';

/** Same shape zustand `persist` writes for `useAuth` (key `rag-auth-storage`). */
const FAKE_AUTH = {
  state: {
    user: { id: 'e2e-user', email: 'e2e@example.com', display_name: 'E2E', roles: ['user'] },
    accessToken: 'e2e-access-token',
    refreshToken: 'e2e-refresh-token',
    isAuthenticated: true,
  },
  version: 0,
};

/**
 * Chat sits behind the login form since the Auth panel landed; seed a signed-in user
 * before the app boots so the question input is rendered (mock mode has no auth endpoint).
 */
export async function seedAuth(page: Page): Promise<void> {
  await page.addInitScript((auth) => {
    localStorage.setItem('rag-auth-storage', JSON.stringify(auth));
  }, FAKE_AUTH);
}

/** Freeze CSS/JS motion so screenshots are reproducible (uiStore reads `rkt.settings`). */
export async function seedReducedMotion(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('rkt.settings', JSON.stringify({ reduceMotion: true }));
  });
}

export async function openWorld(page: Page, url: string = APP): Promise<void> {
  await page.goto(url);
  await expect(page.getByTestId('category-legend')).toBeVisible({ timeout: 30_000 });
}

export async function ask(page: Page, question: string = QUESTION): Promise<void> {
  await page.getByLabel('Câu hỏi').fill(question);
  await page.getByLabel('Câu hỏi').press('Enter');
}

export async function askAndFinish(page: Page): Promise<void> {
  await ask(page);
  await expect(page.getByTestId('pipeline-status')).toHaveAttribute('data-visual-phase', 'done', { timeout: 60_000 });
}
