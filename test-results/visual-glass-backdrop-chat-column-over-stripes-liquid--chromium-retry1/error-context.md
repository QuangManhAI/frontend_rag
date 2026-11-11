# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> glass backdrop >> chat column over stripes (liquid)
- Location: e2e/visual.spec.ts:219:5

# Error details

```
Error: expect(page).toHaveScreenshot(expected) failed

  44335 pixels (ratio 0.31 of all image pixels) are different.

  Snapshot: glass-backdrop-liquid.png

Call log:
  - Expect "toHaveScreenshot(glass-backdrop-liquid.png)" with timeout 15000ms
    - verifying given screenshot expectation
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - 44335 pixels (ratio 0.31 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - 44335 pixels (ratio 0.31 of all image pixels) are different.

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e8]:
    - generic [ref=e9]:
      - generic [ref=e10]:
        - generic [ref=e11]: "37.9"
        - generic [ref=e12]: FPS
      - generic [ref=e13]:
        - generic [ref=e14]:
          - text: "Mean: 62.6"
          - generic [ref=e15]: ± 82.2
        - generic [ref=e16]: "Min: 18.7 · Max: 416.7"
    - generic [ref=e17]:
      - generic [ref=e18]: "Frame Time:"
      - generic [ref=e19]:
        - text: 24.4 ms
        - generic [ref=e20]: ± 11.0 ms
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
  - region "Khung chat" [ref=e62]:
    - generic [ref=e63]:
      - button "Lịch sử trò chuyện" [ref=e64] [cursor=pointer]
      - button "Đoạn chat mới" [ref=e69] [cursor=pointer]
      - generic [ref=e71]:
        - heading "Hỏi đáp RAG" [level=2] [ref=e75]
        - generic [ref=e76]: mock
      - generic [ref=e77]:
        - generic "e2e@example.com" [ref=e78]: E2E
        - button "Đăng xuất" [ref=e79] [cursor=pointer]
        - button "Thu gọn chat" [ref=e83] [cursor=pointer]
    - generic [ref=e87]:
      - generic [ref=e88]:
        - paragraph [ref=e89]: Hỏi cây tri thức
        - text: Mỗi điểm sáng trên tán là một bài báo. Gửi câu hỏi để xem quả cầu vector bay theo cành, so sánh và tìm ra các bài gần nhất.
      - generic [ref=e93]:
        - button "LoRA giúp fine-tune transformer hiệu quả như thế nào?" [ref=e94] [cursor=pointer]
        - button "Các phương pháp dense retrieval và reranking cho RAG?" [ref=e95] [cursor=pointer]
        - button "Diffusion model trong segmentation ảnh y tế" [ref=e96] [cursor=pointer]
        - button "Sim2real cho robot manipulation" [ref=e97] [cursor=pointer]
        - button "Thử lỗi /error" [ref=e98] [cursor=pointer]
    - generic [ref=e99]:
      - textbox "Câu hỏi" [ref=e100]:
        - /placeholder: Hỏi về các bài báo… (Enter gửi, Shift+Enter xuống dòng)
      - button "Gửi" [disabled] [ref=e101]
  - generic [ref=e105]:
    - button "Loại bài báo 10" [expanded] [ref=e106]:
      - text: Loại bài báo
      - generic [ref=e111]: "10"
    - list [ref=e114]:
      - listitem [ref=e115]:
        - button "cs.LG Machine Learning 1.452" [ref=e116]:
          - generic [ref=e118]: cs.LG
          - generic [ref=e119]: Machine Learning
          - generic [ref=e120]: "1.452"
      - listitem [ref=e121]:
        - button "cs.CL Computation and Language 1.149" [ref=e122]:
          - generic [ref=e124]: cs.CL
          - generic [ref=e125]: Computation and Language
          - generic [ref=e126]: "1.149"
      - listitem [ref=e127]:
        - button "cs.CV Computer Vision 771" [ref=e128]:
          - generic [ref=e130]: cs.CV
          - generic [ref=e131]: Computer Vision
          - generic [ref=e132]: "771"
      - listitem [ref=e133]:
        - button "cs.AI Artificial Intelligence 1.093" [ref=e134]:
          - generic [ref=e136]: cs.AI
          - generic [ref=e137]: Artificial Intelligence
          - generic [ref=e138]: "1.093"
      - listitem [ref=e139]:
        - button "stat.ML Statistical ML 401" [ref=e140]:
          - generic [ref=e142]: stat.ML
          - generic [ref=e143]: Statistical ML
          - generic [ref=e144]: "401"
      - listitem [ref=e145]:
        - button "cs.IR Information Retrieval 996" [ref=e146]:
          - generic [ref=e148]: cs.IR
          - generic [ref=e149]: Information Retrieval
          - generic [ref=e150]: "996"
      - listitem [ref=e151]:
        - button "cs.RO Robotics 612" [ref=e152]:
          - generic [ref=e154]: cs.RO
          - generic [ref=e155]: Robotics
          - generic [ref=e156]: "612"
      - listitem [ref=e157]:
        - button "math.OC Optimization and Control 390" [ref=e158]:
          - generic [ref=e160]: math.OC
          - generic [ref=e161]: Optimization and Control
          - generic [ref=e162]: "390"
      - listitem [ref=e163]:
        - button "q-bio.QM Quantitative Methods 502" [ref=e164]:
          - generic [ref=e166]: q-bio.QM
          - generic [ref=e167]: Quantitative Methods
          - generic [ref=e168]: "502"
      - listitem [ref=e169]:
        - button "physics.comp-ph Computational Physics 634" [ref=e170]:
          - generic [ref=e172]: physics.comp-ph
          - generic [ref=e173]: Computational Physics
          - generic [ref=e174]: "634"
```

# Test source

```ts
  130 | test('backdrop-filter layers per state', async ({ page }) => {
  131 |   await seedReducedMotion(page);
  132 |   await page.goto(APP);
  133 |   await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible({ timeout: 30_000 });
  134 |   const auth = await backdropLayers(page);
  135 | 
  136 |   await seedAuth(page);
  137 |   await openWorld(page);
  138 |   await page.getByLabel('Lịch sử trò chuyện').click();
  139 |   const history = await backdropLayers(page);
  140 |   await page.getByLabel('Đóng lịch sử').click();
  141 | 
  142 |   await askAndFinish(page);
  143 |   const answer = await backdropLayers(page);
  144 | 
  145 |   console.log(`backdrop-filter layers — auth: ${auth} · history: ${history} · answer: ${answer}`);
  146 |   expect(answer).toBeGreaterThan(0);
  147 | });
  148 | 
  149 | /** Liquid Glass level 2+ (P21): specular highlight on, light at rest above the screen (reduced motion). */
  150 | test.describe('liquid glass', () => {
  151 |   test.beforeEach(async ({ page }) => {
  152 |     await seedReducedMotion(page, { glass: 'liquid' });
  153 |     await seedAuth(page);
  154 |   });
  155 | 
  156 |   test('01 overview (lg2)', async ({ page }) => {
  157 |     await openWorld(page);
  158 |     await expect(page.locator('html')).toHaveAttribute('data-lg-level', /^[23]$/);
  159 |     await shoot(page, '01-overview-lg2');
  160 |   });
  161 | 
  162 |   test('02 chat collapsed (lg2)', async ({ page }) => {
  163 |     await openWorld(page);
  164 |     await page.getByLabel('Thu gọn chat').click();
  165 |     await expect(page.getByLabel('Mở chat')).toBeVisible();
  166 |     await shoot(page, '02-chat-collapsed-lg2');
  167 |   });
  168 | 
  169 |   test('05 settings (lg2)', async ({ page }) => {
  170 |     await openWorld(page);
  171 |     await page.getByTestId('settings-toggle').click();
  172 |     await expect(page.getByTestId('settings-panel')).toBeVisible();
  173 |     await shoot(page, '05-settings-lg2');
  174 |   });
  175 | });
  176 | 
  177 | test.describe('glass level behaviour', () => {
  178 |   test('the setting drives data-lg-level and level 0 drops every backdrop-filter', async ({ page }) => {
  179 |     await seedSettings(page, {});
  180 |     await seedAuth(page);
  181 |     await openWorld(page);
  182 |     const html = page.locator('html');
  183 |     await expect(html).toHaveAttribute('data-lg-level', /^[23]$/); // auto on Chromium
  184 |     await page.getByTestId('settings-toggle').click();
  185 |     await page.getByTestId('glass-frosted').click();
  186 |     await expect(html).toHaveAttribute('data-lg-level', '1');
  187 |     await page.getByTestId('glass-off').click();
  188 |     await expect(html).toHaveAttribute('data-lg-level', '0');
  189 |     expect(await backdropLayers(page)).toBe(0);
  190 |     // Persisted for the next visit (a reload would re-run the seeding init script).
  191 |     const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('rkt.settings') ?? '{}').glass);
  192 |     expect(stored).toBe('off');
  193 |   });
  194 | 
  195 |   test('the light follows the pointer, and stays put with reduced motion', async ({ page }) => {
  196 |     await seedSettings(page, { glass: 'liquid' });
  197 |     await seedAuth(page);
  198 |     await openWorld(page);
  199 |     const light = () => page.getByTestId('chat-dock').evaluate((el) => Number((el as HTMLElement).style.getPropertyValue('--lg-light-x') || 0));
  200 |     await page.mouse.move(1430, 450);
  201 |     await expect.poll(light).toBeGreaterThan(0.9);
  202 | 
  203 |     await page.getByTestId('settings-toggle').click();
  204 |     await page.getByLabel('Giảm chuyển động').check();
  205 |     await expect.poll(light).toBe(0);
  206 |     await page.mouse.move(10, 450);
  207 |     await page.waitForTimeout(300);
  208 |     expect(await light()).toBe(0);
  209 |   });
  210 | });
  211 | 
  212 | /**
  213 |  * Glass must blur what is behind it (regression guard for P19→P22): a high-contrast stripe layer is put
  214 |  * between the 3D scene and the UI, so a surface that stops sampling its backdrop shows crisp stripes.
  215 |  * The liquid shot also shows the level-3 refraction band along the chat column's edge.
  216 |  */
  217 | test.describe('glass backdrop', () => {
  218 |   for (const glass of ['frosted', 'liquid'] as const) {
  219 |     test(`chat column over stripes (${glass})`, async ({ page }) => {
  220 |       await seedReducedMotion(page, { glass });
  221 |       await seedAuth(page);
  222 |       await openWorld(page);
  223 |       if (glass === 'liquid') await expect(page.locator('html')).toHaveAttribute('data-lg-refract', 'ready', { timeout: 15_000 });
  224 |       await page.evaluate(() => {
  225 |         const stripes = document.createElement('div');
  226 |         stripes.style.cssText = 'position:fixed;inset:0;z-index:15;pointer-events:none;background:repeating-linear-gradient(90deg,#fff 0 6px,#e0245e 6px 12px,#000 12px 18px)';
  227 |         document.querySelector('[data-testid=chat-dock]')?.closest('.fixed')?.append(stripes);
  228 |       });
  229 |       await page.evaluate(() => document.fonts.ready);
> 230 |       await expect(page).toHaveScreenshot(`glass-backdrop-${glass}.png`, {
      |                          ^ Error: expect(page).toHaveScreenshot(expected) failed
  231 |         clip: { x: 0, y: 60, width: 480, height: 300 },
  232 |         animations: 'disabled',
  233 |         caret: 'hide',
  234 |         stylePath: STYLE,
  235 |         maxDiffPixels: NOISE_PX,
  236 |       });
  237 |     });
  238 |   }
  239 | 
  240 |   test('outside Chromium: level 2, no refraction filter, clean console', async ({ page }) => {
  241 |     const errors: string[] = [];
  242 |     page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  243 |     await page.addInitScript(() => Object.defineProperty(navigator, 'userAgentData', { value: { brands: [{ brand: 'Firefox', version: '140' }] } }));
  244 |     await seedReducedMotion(page, { glass: 'liquid' });
  245 |     await seedAuth(page);
  246 |     await openWorld(page);
  247 |     await expect(page.locator('html')).toHaveAttribute('data-lg-level', '2');
  248 |     await page.waitForTimeout(1000);
  249 |     await expect(page.getByTestId('liquid-filters')).toHaveCount(0);
  250 |     const filter = await page.getByTestId('chat-dock').evaluate((el) => getComputedStyle(el).backdropFilter);
  251 |     expect(filter).not.toContain('url(');
  252 |     expect(errors.filter((e) => /filter|refract|svg/i.test(e))).toEqual([]);
  253 |   });
  254 | 
  255 |   test('resizing the window keeps the refraction map cache bounded', async ({ page }) => {
  256 |     await seedReducedMotion(page, { glass: 'liquid' });
  257 |     await seedAuth(page);
  258 |     await openWorld(page);
  259 |     await expect(page.locator('html')).toHaveAttribute('data-lg-refract', 'ready', { timeout: 15_000 });
  260 |     for (let i = 0; i < 10; i++) {
  261 |       await page.setViewportSize({ width: 1200 + i * 20, height: 800 + i * 10 });
  262 |       await page.waitForTimeout(450); // 150 ms debounce + idle build
  263 |     }
  264 |     const { size, max } = await page.evaluate(async () => {
  265 |       const m = await import('/src/shared/ui/LiquidFilters.tsx');
  266 |       return { size: m.refractionCacheSize(), max: m.refractionCacheMax() };
  267 |     });
  268 |     expect(size).toBeLessThanOrEqual(max);
  269 |     const href = await page.locator('#lg-refract-chat feImage').first().getAttribute('href');
  270 |     expect(href?.startsWith('data:image/png')).toBe(true);
  271 |   });
  272 | });
  273 | 
```