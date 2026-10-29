# design-migration-report.md — Báo cáo chuyển đổi Design System (P15 → P23)

- **Motivation/Background**: Chuỗi prompt [`../../docs/FE3d_prompt_v2.md`](../../docs/FE3d_prompt_v2.md) sửa mạnh giao diện; mỗi bước phải có số đo trước/sau để người duyệt quyết định Chấp nhận / Sửa / Từ chối.
- **Purpose**: Một dòng số đo cho mỗi prompt: vi phạm `check:design`, STATS thang giá trị, sai khác ảnh, hiệu năng, quyết định.
- **Overview Pipeline**: Cuối mỗi prompt chạy `npm run check:design`, `npm run test:visual`, `npm run test:perf` (khi chạm 3D/kính) rồi ghi vào đây.
- **Detailed Plan**: §1 Bảng tổng; §2 Cách đo; §3 Chi tiết từng prompt.
- **References**: [`../../docs/FE_DESIGN_SYSTEM.md`](../../docs/FE_DESIGN_SYSTEM.md), [`../../docs/FE_DESIGN_AUDIT.md`](../../docs/FE_DESIGN_AUDIT.md), [`../scripts/check-design.cjs`](../scripts/check-design.cjs), [`../e2e/visual.spec.ts`](../e2e/visual.spec.ts), [`../scripts/perf-chat-benchmark.cjs`](../scripts/perf-chat-benchmark.cjs), [`../PROGRESS.md`](../PROGRESS.md).
- **Created**: 2026-10-29T23:55:00+07:00
- **Last Updated**: 2026-10-30T01:05:00+07:00

[STATUS: IN_PROGRESS]

---

## 1. Bảng tổng

Cột vi phạm theo thứ tự rule của `check-design` (số **dòng** vi phạm, không phải số class):
`raw-color · tw-palette · raw-arbitrary · retired-radius · var-fallback · unknown-var · trig-in-frame · trig-any · css-raw-radius · css-raw-blur · css-raw-size · css-raw-color · css-raw-duration · css-raw-easing`

| Prompt | Ngày | check-design (14 rule) | STATS radius · blur · alpha trắng · cỡ chữ | Visual diff | Frame median (p95) | E2E | Quyết định |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| **P15** (baseline) | 2026-10-29 | 4 · 8 · 26 · 13 · 4 · 10 · 5 · 19 · 20 · 11 · 18 · 20 · 21 · 8 | 8 · 5 · 12 · 19 | baseline 8 ảnh (chụp lại ở P16 với bước chờ font; ổn định 5/5) | 2.2 ms (3.4 ms) | 5/6 (c fail sẵn có) | chờ duyệt |
| **P16** token | 2026-10-30 | không đổi | 8 · 5 · **14** · 19 (thêm 0.08, 0.24) | **0** (≤ 600 px nhiễu, 2/2) | không chạm 3D/kính — không đo | 5/6 (không đổi) | chờ duyệt |
| **P17** màu | 2026-10-30 | **0 · 0** · 26 · 13 · **0 · 0** · 5 · 19 · 20 · 11 · 18 · **16** · 21 · 8 | 8 · 5 · 14 · 19 | `06` đổi 1.430 px (ngăn kéo đục, chữ faint/accent-ink); 7 ảnh còn lại ≤ nhiễu | không chạm 3D/kính — không đo | **6/6** (D-026) | **chấp nhận** — baseline 06 cập nhật sau khi người duyệt xem ảnh (2026-10-30) |

---

## 2. Cách đo

| Đại lượng | Lệnh | Điều kiện |
| :-- | :-- | :-- |
| Vi phạm + STATS | `npm run check:design` | Toàn bộ `src/**/*.tsx` (trừ test, `PerfHUD.tsx`) và `src/index.css` |
| Ảnh giao diện | `VISUAL_THRESHOLD=<tỷ lệ> npm run test:visual` (bỏ trống = "không đổi": ≤ 600 px nhiễu) | Mock, `?vectors=8000&nofx`, reduce motion, 1440×900 (mobile 390×844), canvas + PerfHUD bị ẩn (`e2e/visual.css`), `pipeline-status` bị che |
| Hiệu năng | `BROWSER_CHANNEL=chromium node scripts/perf-chat-benchmark.cjs 'http://localhost:5174/?vectors=150000&bench&perf'` | Dev server mock (`VITE_USE_MOCK=true npx vite --port 5174`), headless Chromium không vsync, Apple M4, 3 lần, lấy median |
| Unit test | `NODE_OPTIONS=--no-experimental-webstorage npm test -- --run` | Node 26 (xem `ASSUMPTIONS.md` [P15]) |

> Frame time ở đây là khoảng `requestAnimationFrame` trong headless không vsync — chỉ dùng **so sánh tương đối** giữa các prompt trên cùng máy, không so với số trong `perf-report.md`.

---

## 3. Chi tiết từng prompt

### P15 — Baseline

- **Hiệu năng (3 lần):** median 2.1 / 2.2 / 2.2 ms; p95 3.6 / 3.4 / 3.4 ms; long task 6 / 4 / 4 (max 577 / 423 / 406 ms, lúc tải thế giới + stream KaTeX ở chế độ dev).
- **STATS chi tiết:**
  - radius: 4 · 5 · 6 · 8 · 10 · 12 · 14 · 16 px + full
  - blur: 6 · 10 · 12 · 14 · 16 px
  - alpha trắng: 0.03 · 0.04 · 0.05 · 0.06 · 0.10 · 0.12 · 0.14 · 0.15 · 0.16 · 0.18 · 0.22 · 0.25
  - cỡ chữ: 10 · 10.4 · 10.88 · 11 · 11.2 · 11.52 · 12 · 12.48 · 12.8 · 13 · 13.12 · 13.28 · 13.6 · 14 · 14.4 · 16 · 22 px + 0.72em · 0.85em
- **Ảnh baseline:** `e2e/visual.spec.ts-snapshots/` — 01 overview, 02 chat thu gọn, 03 trả lời xong, 04 PaperPanel (verified), 05 Cài đặt, 06 Lịch sử, 07 Đăng nhập, 08 mobile.
- **Phát hiện ngoài phạm vi:** E2E c fail sẵn có; unit test cần cờ Node trên Node ≥ 25; benchmark mặc định dùng Edge.

### P16 — Nền tảng token

- **Ngưỡng nhiễu ảnh:** hai lần chạy giống hệt lệch tới 428 px (chữ); định nghĩa `--ink-faint` (thay đổi thật nhỏ nhất) lệch 907 px → `NOISE_PX = 600`. Hiếm (≈1/9) có nhãn neo 3D trễ một khung (13.620 px) → `retries: 1`.
- **`--ink-faint` hoãn sang P17** (xem `ASSUMPTIONS.md` [P16]).

### P17 — Sửa lỗi lệch token

- **Ảnh 06 trước/sau:** `--ui-panel-bg` thay bằng `--ui-surface-strong` (α 0.9) làm lộ chữ khung chat dưới ngăn kéo → đổi sang `.surface-opaque` (strong chồng lên `--bg`). Chữ "LỊCH SỬ TRÒ CHUYỆN" và trạng thái trống dùng `--ink-faint` (trước đây biến không tồn tại → màu thừa kế); nút "Đoạn chat mới" chữ `--accent-ink`.
- **`--ui-border` 0.14:** không vượt ngưỡng ở ảnh nào.

