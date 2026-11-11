# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> signed in >> 05 settings
- Location: e2e/visual.spec.ts:79:3

# Error details

```
Error: expect(page).toHaveScreenshot(expected) failed

  14279 pixels (ratio 0.02 of all image pixels) are different.

  Snapshot: 05-settings.png

Call log:
  - Expect "toHaveScreenshot(05-settings.png)" with timeout 15000ms
    - verifying given screenshot expectation
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - 14279 pixels (ratio 0.02 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - 14279 pixels (ratio 0.02 of all image pixels) are different.

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e8]:
    - generic [ref=e9]:
      - generic [ref=e10]:
        - generic [ref=e11]: "62.5"
        - generic [ref=e12]: FPS
      - generic [ref=e13]:
        - generic [ref=e14]:
          - text: "Mean: 64.5"
          - generic [ref=e15]: ± 38.6
        - generic [ref=e16]: "Min: 22.8 · Max: 454.5"
    - generic [ref=e17]:
      - generic [ref=e18]: "Frame Time:"
      - generic [ref=e19]:
        - text: 16.7 ms
        - generic [ref=e20]: ± 3.1 ms
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
  - banner [ref=e34]:
    - generic [ref=e42]:
      - heading "Cây Tri Thức Vector" [level=1] [ref=e43]
      - paragraph [ref=e44]: RAG trực quan · tài liệu khoa học
    - generic "Trạng thái hệ thống" [ref=e45]:
      - generic [ref=e46]: MongoDB
      - generic [ref=e48]: Qdrant
      - generic [ref=e50]: LLM
      - generic [ref=e52]: Route
    - button "Cài đặt" [active] [pressed] [ref=e54] [cursor=pointer]
  - dialog "Cài đặt" [ref=e59]:
    - generic [ref=e60]:
      - heading "Cài đặt" [level=2] [ref=e61]
      - button "Đóng cài đặt" [ref=e62] [cursor=pointer]
    - generic [ref=e66]:
      - generic [ref=e67]:
        - generic [ref=e68]: top_k (1–20)
        - spinbutton "top_k (1–20)" [ref=e69]: "5"
      - generic [ref=e70]:
        - generic [ref=e71]: nprobe (1–6)
        - spinbutton "nprobe (1–6)" [ref=e72]: "2"
    - generic [ref=e73]:
      - generic [ref=e74]: Lọc loại bài báo
      - combobox "Lọc loại bài báo" [ref=e75]:
        - option "Tất cả" [selected]
        - option "cs.LG — Machine Learning"
        - option "cs.CL — Computation and Language"
        - option "cs.CV — Computer Vision"
        - option "cs.AI — Artificial Intelligence"
        - option "stat.ML — Statistical ML"
        - option "cs.IR — Information Retrieval"
        - option "cs.RO — Robotics"
        - option "math.OC — Optimization and Control"
        - option "q-bio.QM — Quantitative Methods"
        - option "physics.comp-ph — Computational Physics"
    - 'group "Giao diện · hệ thống: tối" [ref=e76]':
      - generic [ref=e77]:
        - text: Giao diện
        - generic [ref=e78]: "· hệ thống: tối"
      - radiogroup "Giao diện" [ref=e79]:
        - radio "Hệ thống" [checked] [ref=e80] [cursor=pointer]
        - radio "Sáng" [ref=e81] [cursor=pointer]
        - radio "Tối" [ref=e82] [cursor=pointer]
    - 'group "Chất lượng · đang dùng: đầy đủ" [ref=e83]':
      - generic [ref=e84]:
        - text: Chất lượng
        - generic [ref=e85]: "· đang dùng: đầy đủ"
      - radiogroup "Chất lượng hiển thị" [ref=e86]:
        - radio "Tự động" [checked] [ref=e87] [cursor=pointer]
        - radio "Cao" [ref=e88] [cursor=pointer]
        - radio "Thấp" [ref=e89] [cursor=pointer]
    - 'group "Hiệu ứng kính · cấp 1: kính mờ" [ref=e90]':
      - generic [ref=e91]:
        - text: Hiệu ứng kính
        - generic [ref=e92]: "· cấp 1: kính mờ"
      - radiogroup "Hiệu ứng kính" [ref=e93]:
        - radio "Tự động" [ref=e94] [cursor=pointer]
        - radio "Đục" [ref=e95] [cursor=pointer]
        - radio "Mờ" [checked] [ref=e96] [cursor=pointer]
        - radio "Liquid" [ref=e97] [cursor=pointer]
    - generic [ref=e98]:
      - generic [ref=e99] [cursor=pointer]:
        - checkbox "Tăng điểm theo authority (PageRank)" [checked] [ref=e100]
        - text: Tăng điểm theo authority (PageRank)
      - generic [ref=e101] [cursor=pointer]:
        - checkbox "Mở rộng câu hỏi (query expansion)" [ref=e102]
        - text: Mở rộng câu hỏi (query expansion)
      - generic [ref=e103] [cursor=pointer]:
        - checkbox "Giảm chuyển động" [checked] [ref=e104]
        - text: Giảm chuyển động
      - generic [ref=e105] [cursor=pointer]:
        - checkbox "Hiện nhãn chủ đề trên nhánh" [ref=e106]
        - text: Hiện nhãn chủ đề trên nhánh
    - region "Lọc theo năm" [ref=e107]:
      - generic [ref=e108]:
        - generic [ref=e111]: Năm ≤ 2026
        - generic "8.000 bài đang hiện" [ref=e112]: 8K bài
      - generic [ref=e113]:
        - slider "Năm ≤ 2026" [ref=e114]: "2026"
        - button "Phát theo thời gian" [ref=e115] [cursor=pointer]
    - region "Cào dữ liệu" [ref=e118]:
      - generic [ref=e119]:
        - text: Cào dữ liệu
        - generic [ref=e124]: Đã kết nối
      - generic [ref=e130]:
        - generic [ref=e131]: Tạm dừng 8.000 / 150.000
        - generic [ref=e132]:
          - generic [ref=e133]: Đã tải
          - progressbar "Đã tải" [ref=e134]
          - generic [ref=e136]: 5.3%
        - generic [ref=e137]:
          - generic [ref=e138]: Đã embed
          - progressbar "Đã embed" [ref=e139]
          - generic [ref=e141]: 5.3%
        - generic [ref=e142]:
          - generic [ref=e143]: "0"
          - generic [ref=e144]: bài/phút
          - generic "Loại bài đang chảy"
        - generic [ref=e145] [cursor=pointer]:
          - checkbox "Hiện hạt lên cây" [checked] [ref=e146]
          - text: Hiện hạt lên cây
        - generic [ref=e147]:
          - generic [ref=e148]: Giả lập (mock)
          - generic [ref=e149]:
            - button "Bắt đầu cào" [ref=e150] [cursor=pointer]
            - button "300/ph" [pressed] [ref=e153] [cursor=pointer]
            - button "3.000/ph" [ref=e154] [cursor=pointer]
          - generic [ref=e155] [cursor=pointer]:
            - checkbox "Giả lập mất kết nối" [ref=e156]
            - text: Giả lập mất kết nối
    - button "Đặt lại" [ref=e157] [cursor=pointer]
  - region "Khung chat" [ref=e163]:
    - generic [ref=e164]:
      - button "Lịch sử trò chuyện" [ref=e165] [cursor=pointer]
      - button "Đoạn chat mới" [ref=e170] [cursor=pointer]
      - generic [ref=e172]:
        - heading "Hỏi đáp RAG" [level=2] [ref=e176]
        - generic [ref=e177]: mock
      - generic [ref=e178]:
        - generic "e2e@example.com" [ref=e179]: E2E
        - button "Đăng xuất" [ref=e180] [cursor=pointer]
        - button "Thu gọn chat" [ref=e184] [cursor=pointer]
    - generic [ref=e188]:
      - generic [ref=e189]:
        - paragraph [ref=e190]: Hỏi cây tri thức
        - text: Mỗi điểm sáng trên tán là một bài báo. Gửi câu hỏi để xem quả cầu vector bay theo cành, so sánh và tìm ra các bài gần nhất.
      - generic [ref=e194]:
        - button "LoRA giúp fine-tune transformer hiệu quả như thế nào?" [ref=e195] [cursor=pointer]
        - button "Các phương pháp dense retrieval và reranking cho RAG?" [ref=e196] [cursor=pointer]
        - button "Diffusion model trong segmentation ảnh y tế" [ref=e197] [cursor=pointer]
        - button "Sim2real cho robot manipulation" [ref=e198] [cursor=pointer]
        - button "Thử lỗi /error" [ref=e199] [cursor=pointer]
    - generic [ref=e200]:
      - textbox "Câu hỏi" [ref=e201]:
        - /placeholder: Hỏi về các bài báo… (Enter gửi, Shift+Enter xuống dòng)
      - button "Gửi" [disabled] [ref=e202]
  - generic [ref=e205]:
    - button "Loại bài báo 10" [expanded] [ref=e206]:
      - text: Loại bài báo
      - generic [ref=e211]: "10"
    - list [ref=e214]:
      - listitem [ref=e215]:
        - button "cs.LG Machine Learning 1.452" [ref=e216]:
          - generic [ref=e218]: cs.LG
          - generic [ref=e219]: Machine Learning
          - generic [ref=e220]: "1.452"
      - listitem [ref=e221]:
        - button "cs.CL Computation and Language 1.149" [ref=e222]:
          - generic [ref=e224]: cs.CL
          - generic [ref=e225]: Computation and Language
          - generic [ref=e226]: "1.149"
      - listitem [ref=e227]:
        - button "cs.CV Computer Vision 771" [ref=e228]:
          - generic [ref=e230]: cs.CV
          - generic [ref=e231]: Computer Vision
          - generic [ref=e232]: "771"
      - listitem [ref=e233]:
        - button "cs.AI Artificial Intelligence 1.093" [ref=e234]:
          - generic [ref=e236]: cs.AI
          - generic [ref=e237]: Artificial Intelligence
          - generic [ref=e238]: "1.093"
      - listitem [ref=e239]:
        - button "stat.ML Statistical ML 401" [ref=e240]:
          - generic [ref=e242]: stat.ML
          - generic [ref=e243]: Statistical ML
          - generic [ref=e244]: "401"
      - listitem [ref=e245]:
        - button "cs.IR Information Retrieval 996" [ref=e246]:
          - generic [ref=e248]: cs.IR
          - generic [ref=e249]: Information Retrieval
          - generic [ref=e250]: "996"
      - listitem [ref=e251]:
        - button "cs.RO Robotics 612" [ref=e252]:
          - generic [ref=e254]: cs.RO
          - generic [ref=e255]: Robotics
          - generic [ref=e256]: "612"
      - listitem [ref=e257]:
        - button "math.OC Optimization and Control 390" [ref=e258]:
          - generic [ref=e260]: math.OC
          - generic [ref=e261]: Optimization and Control
          - generic [ref=e262]: "390"
      - listitem [ref=e263]:
        - button "q-bio.QM Quantitative Methods 502" [ref=e264]:
          - generic [ref=e266]: q-bio.QM
          - generic [ref=e267]: Quantitative Methods
          - generic [ref=e268]: "502"
      - listitem [ref=e269]:
        - button "physics.comp-ph Computational Physics 634" [ref=e270]:
          - generic [ref=e272]: physics.comp-ph
          - generic [ref=e273]: Computational Physics
          - generic [ref=e274]: "634"
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