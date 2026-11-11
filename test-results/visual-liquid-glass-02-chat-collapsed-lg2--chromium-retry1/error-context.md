# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> liquid glass >> 02 chat collapsed (lg2)
- Location: e2e/visual.spec.ts:162:3

# Error details

```
Error: expect(page).toHaveScreenshot(expected) failed

  1929 pixels (ratio 0.01 of all image pixels) are different.

  Snapshot: 02-chat-collapsed-lg2.png

Call log:
  - Expect "toHaveScreenshot(02-chat-collapsed-lg2.png)" with timeout 15000ms
    - verifying given screenshot expectation
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - 1929 pixels (ratio 0.01 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - 1929 pixels (ratio 0.01 of all image pixels) are different.

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e8]:
    - generic [ref=e9]:
      - generic [ref=e10]:
        - generic [ref=e11]: "59.9"
        - generic [ref=e12]: FPS
      - generic [ref=e13]:
        - generic [ref=e14]:
          - text: "Mean: 61.7"
          - generic [ref=e15]: ± 38.2
        - generic [ref=e16]: "Min: 19.1 · Max: 285.7"
    - generic [ref=e17]:
      - generic [ref=e18]: "Frame Time:"
      - generic [ref=e19]:
        - text: 19.5 ms
        - generic [ref=e20]: ± 9.4 ms
    - generic [ref=e21]:
      - generic [ref=e22]: "Draw Calls / Tris:"
      - generic [ref=e23]: 24 / 62.5k
    - generic [ref=e24]:
      - generic [ref=e25]: "Tier / DPR:"
      - generic [ref=e26]: Tier 0 · DPR 1.00
    - generic [ref=e27]:
      - generic [ref=e28]: "Quick Tier:"
      - generic [ref=e29]:
        - button "T0" [ref=e30]
        - button "T1" [ref=e31]
        - button "T2" [ref=e32]
        - button "Max" [ref=e33]
  - banner [ref=e35]:
    - generic [ref=e43]:
      - heading "Cây Tri Thức Vector" [level=1] [ref=e44]
      - paragraph [ref=e45]: RAG trực quan · tài liệu khoa học
    - generic "Trạng thái hệ thống" [ref=e46]:
      - generic [ref=e47]: MongoDB
      - generic [ref=e49]: Qdrant
      - generic [ref=e51]: LLM
      - generic [ref=e53]: Route
    - button "Cài đặt" [ref=e55] [cursor=pointer]
  - button "Mở chat" [ref=e61] [cursor=pointer]: Chat
  - generic [ref=e66]:
    - button "Loại bài báo 10" [expanded] [ref=e67]:
      - text: Loại bài báo
      - generic [ref=e72]: "10"
    - list [ref=e75]:
      - listitem [ref=e76]:
        - button "cs.LG Machine Learning 1.452" [ref=e77]:
          - generic [ref=e79]: cs.LG
          - generic [ref=e80]: Machine Learning
          - generic [ref=e81]: "1.452"
      - listitem [ref=e82]:
        - button "cs.CL Computation and Language 1.149" [ref=e83]:
          - generic [ref=e85]: cs.CL
          - generic [ref=e86]: Computation and Language
          - generic [ref=e87]: "1.149"
      - listitem [ref=e88]:
        - button "cs.CV Computer Vision 771" [ref=e89]:
          - generic [ref=e91]: cs.CV
          - generic [ref=e92]: Computer Vision
          - generic [ref=e93]: "771"
      - listitem [ref=e94]:
        - button "cs.AI Artificial Intelligence 1.093" [ref=e95]:
          - generic [ref=e97]: cs.AI
          - generic [ref=e98]: Artificial Intelligence
          - generic [ref=e99]: "1.093"
      - listitem [ref=e100]:
        - button "stat.ML Statistical ML 401" [ref=e101]:
          - generic [ref=e103]: stat.ML
          - generic [ref=e104]: Statistical ML
          - generic [ref=e105]: "401"
      - listitem [ref=e106]:
        - button "cs.IR Information Retrieval 996" [ref=e107]:
          - generic [ref=e109]: cs.IR
          - generic [ref=e110]: Information Retrieval
          - generic [ref=e111]: "996"
      - listitem [ref=e112]:
        - button "cs.RO Robotics 612" [ref=e113]:
          - generic [ref=e115]: cs.RO
          - generic [ref=e116]: Robotics
          - generic [ref=e117]: "612"
      - listitem [ref=e118]:
        - button "math.OC Optimization and Control 390" [ref=e119]:
          - generic [ref=e121]: math.OC
          - generic [ref=e122]: Optimization and Control
          - generic [ref=e123]: "390"
      - listitem [ref=e124]:
        - button "q-bio.QM Quantitative Methods 502" [ref=e125]:
          - generic [ref=e127]: q-bio.QM
          - generic [ref=e128]: Quantitative Methods
          - generic [ref=e129]: "502"
      - listitem [ref=e130]:
        - button "physics.comp-ph Computational Physics 634" [ref=e131]:
          - generic [ref=e133]: physics.comp-ph
          - generic [ref=e134]: Computational Physics
          - generic [ref=e135]: "634"
```

# Test source

```ts
  1   | import { fileURLToPath } from 'node:url';
  2   | import { expect, test, type Locator, type Page } from '@playwright/test';
  3   | import { APP, askAndFinish, openWorld, seedAuth, seedReducedMotion, seedSettings } from './helpers';
  4   | 
  5   | /**
  6   |  * UI screenshots used as the visual baseline for the design-system migration
  7   |  * (docs/prompts/FE3d_prompt_v2.md, P15). Each prompt runs this with its own tolerance:
  8   |  *   VISUAL_THRESHOLD=0.015 npm run test:visual
  9   |  * Baselines are only refreshed (--update-snapshots) after a human reviewed the diff.
  10  |  */
  11  | const THRESHOLD = Number(process.env.VISUAL_THRESHOLD ?? 0);
  12  | 
  13  | /**
  14  |  * Text rasterisation flips up to ~430 anti-aliased glyph pixels between identical runs (GPU or CPU),
  15  |  * so "no visual change" means at most NOISE_PX differing pixels (largest flake seen: 428; smallest real change seen — defining --ink-faint in HistoryDrawer: 907).
  16  |  */
  17  | const NOISE_PX = 600;
  18  | 
  19  | // Rarely (~1 in 9 runs) a DOM label anchored to the 3D projection lands a frame late; a real
  20  | // change fails both attempts, a flake passes the retry.
  21  | test.describe.configure({ retries: 1 });
  22  | 
  23  | /** Hides the WebGL canvas and PerfHUD during the shot (a mask would paint over the whole UI). */
  24  | const STYLE = fileURLToPath(new URL('./visual.css', import.meta.url));
  25  | 
  26  | /** Live numbers are not pixel-stable; the UI around them is what we compare. */
  27  | function volatile(page: Page): Locator[] {
  28  |   return [page.getByTestId('pipeline-status')]; // measured ms timings
  29  | }
  30  | 
  31  | async function shoot(page: Page, name: string): Promise<void> {
  32  |   // Vietnamese glyphs live in a separate webfont subset that may start loading after layout.
  33  |   await page.evaluate(async () => {
  34  |     await document.fonts.ready;
  35  |     await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  36  |     await document.fonts.ready;
  37  |   });
> 38  |   await expect(page).toHaveScreenshot(`${name}.png`, {
      |                      ^ Error: expect(page).toHaveScreenshot(expected) failed
  39  |     animations: 'disabled',
  40  |     caret: 'hide',
  41  |     mask: volatile(page),
  42  |     stylePath: STYLE,
  43  |     ...(THRESHOLD > 0 ? { maxDiffPixelRatio: THRESHOLD } : { maxDiffPixels: NOISE_PX }),
  44  |   });
  45  | }
  46  | 
  47  | test.describe('signed in', () => {
  48  |   test.beforeEach(async ({ page }) => {
  49  |     await seedReducedMotion(page);
  50  |     await seedAuth(page);
  51  |   });
  52  | 
  53  |   test('01 overview with chat', async ({ page }) => {
  54  |     await openWorld(page);
  55  |     await shoot(page, '01-overview');
  56  |   });
  57  | 
  58  |   test('02 chat collapsed', async ({ page }) => {
  59  |     await openWorld(page);
  60  |     await page.getByLabel('Thu gọn chat').click();
  61  |     await expect(page.getByLabel('Mở chat')).toBeVisible();
  62  |     await shoot(page, '02-chat-collapsed');
  63  |   });
  64  | 
  65  |   test('03 answer done', async ({ page }) => {
  66  |     await openWorld(page);
  67  |     await askAndFinish(page);
  68  |     await shoot(page, '03-answer-done');
  69  |   });
  70  | 
  71  |   test('04 paper panel (verified citation)', async ({ page }) => {
  72  |     await openWorld(page);
  73  |     await askAndFinish(page);
  74  |     await page.locator('[data-testid="assistant-message"] .cite-chip[data-status="verified"]').first().click();
  75  |     await expect(page.getByTestId('paper-panel')).toHaveAttribute('data-case', 'grounded');
  76  |     await shoot(page, '04-paper-verified');
  77  |   });
  78  | 
  79  |   test('05 settings', async ({ page }) => {
  80  |     await openWorld(page);
  81  |     await page.getByTestId('settings-toggle').click();
  82  |     await expect(page.getByTestId('settings-panel')).toBeVisible();
  83  |     await shoot(page, '05-settings');
  84  |   });
  85  | 
  86  |   test('06 history drawer', async ({ page }) => {
  87  |     await openWorld(page);
  88  |     await page.getByLabel('Lịch sử trò chuyện').click();
  89  |     await expect(page.getByText('Đoạn chat mới').first()).toBeVisible();
  90  |     await shoot(page, '06-history-drawer');
  91  |   });
  92  | 
  93  |   test('08 mobile bottom sheet', async ({ page }) => {
  94  |     await page.setViewportSize({ width: 390, height: 844 });
  95  |     await openWorld(page);
  96  |     await shoot(page, '08-mobile-sheet');
  97  |   });
  98  | });
  99  | 
  100 | test.describe('signed out', () => {
  101 |   test.beforeEach(async ({ page }) => {
  102 |     await seedReducedMotion(page);
  103 |   });
  104 | 
  105 |   test('07 auth form', async ({ page }) => {
  106 |     await page.goto(APP);
  107 |     await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible({ timeout: 30_000 });
  108 |     await shoot(page, '07-auth');
  109 |   });
  110 | });
  111 | 
  112 | /** Glass never stacks on glass (FE_DESIGN_SYSTEM §4.1): count live backdrop-filter layers per state. */
  113 | async function backdropLayers(page: Page): Promise<number> {
  114 |   return page.evaluate(() => {
  115 |     const visible = (el: Element) => {
  116 |       const r = el.getBoundingClientRect();
  117 |       return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  118 |     };
  119 |     const active = (v: string) => v !== '' && v !== 'none';
  120 |     let count = 0;
  121 |     for (const el of document.querySelectorAll('body *')) {
  122 |       if (!visible(el)) continue;
  123 |       if (active(getComputedStyle(el).backdropFilter)) count++;
  124 |       if (active(getComputedStyle(el, '::before').backdropFilter)) count++;
  125 |     }
  126 |     return count;
  127 |   });
  128 | }
  129 | 
  130 | test('backdrop-filter layers per state', async ({ page }) => {
  131 |   await seedReducedMotion(page);
  132 |   await page.goto(APP);
  133 |   await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible({ timeout: 30_000 });
  134 |   const auth = await backdropLayers(page);
  135 | 
  136 |   await seedAuth(page);
  137 |   await openWorld(page);
  138 |   await page.getByLabel('Lịch sử trò chuyện').click();
```