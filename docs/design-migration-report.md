# design-migration-report.md — Báo cáo chuyển đổi Design System (P15 → P23)

- **Motivation/Background**: Chuỗi prompt [`../../docs/FE3d_prompt_v2.md`](../../docs/FE3d_prompt_v2.md) sửa mạnh giao diện; mỗi bước phải có số đo trước/sau để người duyệt quyết định Chấp nhận / Sửa / Từ chối.
- **Purpose**: Một dòng số đo cho mỗi prompt: vi phạm `check:design`, STATS thang giá trị, sai khác ảnh, hiệu năng, quyết định.
- **Overview Pipeline**: Cuối mỗi prompt chạy `npm run check:design`, `npm run test:visual`, `npm run test:perf` (khi chạm 3D/kính) rồi ghi vào đây.
- **Detailed Plan**: §1 Bảng tổng; §2 Cách đo; §3 Chi tiết từng prompt.
- **References**: [`../../docs/FE_DESIGN_SYSTEM.md`](../../docs/FE_DESIGN_SYSTEM.md), [`../../docs/FE_DESIGN_AUDIT.md`](../../docs/FE_DESIGN_AUDIT.md), [`../scripts/check-design.cjs`](../scripts/check-design.cjs), [`../e2e/visual.spec.ts`](../e2e/visual.spec.ts), [`../scripts/perf-chat-benchmark.cjs`](../scripts/perf-chat-benchmark.cjs), [`../PROGRESS.md`](../PROGRESS.md).
- **Created**: 2026-10-29T23:55:00+07:00
- **Last Updated**: 2026-10-30T18:30:00+07:00

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
| **P18** thang | 2026-10-30 | 0 · 0 · 0 · 0 · 0 · 0 · 5 · 19 · 0 · 0 · 0 · 0 · 0 · 0 | **4 · 3 · 6 · 9** (7 + 2 em) | 6/8 ≤ 1.5 %; `03` 2.1 %, `04` 4.2 % (chữ xuống dòng lại) | 2.1 ms (3.4 ms) — ±3 % | 6/6 | **chấp nhận** — 8 baseline cập nhật sau khi người duyệt xem ảnh (2026-10-30) |
| **P19** Glass | 2026-10-30 | 0 (14 rule trừ trig) · trig 5 · 19 | 4 · 3 · 6 · 9 | 7/8 ≤ nhiễu; `07` 4.441 px | 2.0 ms (3.5 ms) — A/B = P18 | 6/6 | **chấp nhận** — baseline 07 cập nhật sau khi người duyệt xem ảnh (2026-10-30) |
| **P20** rotor | 2026-10-30 | **0 (cả 14 rule)** | 4 · 3 · 6 · 9 | 0 (UI); canvas 0.18 % (nhiễu 0.06 %) | 2.1–2.2 ms (3.4 ms) — A/B = P19 | 6/6 | không đổi ảnh mốc — xem `trig-audit.md` §7 |
| **P21** LG cấp 2 | 2026-10-30 | 0 (cả 14 rule) | 4 · 3 · 6 · 9 | `05` 13.410 px (nhóm "Hiệu ứng kính"); 3 ảnh mới `-lg2` | 2.2–2.3 ms (3.4 ms); di chuột: median 2.5 vs 2.6 ms cấp 1, p95 4.4–5.1 vs 3.7 ms | 6/6 | **chấp nhận** — baseline 05 cập nhật, 3 ảnh lg2 nhận làm mốc sau khi người duyệt xem (2026-10-30) |
| **P22** LG cấp 3 | 2026-10-30 | 0 (cả 14 rule) | 4 · 3 · 6 · 9 | 18/18 không đổi; 2 ảnh mới `glass-backdrop-*` (nền sọc) | test:perf median 1.9–2.0 ms; di chuột 2.5 vs 2.5–2.7 ms cấp 1 | 6/6 | **chấp nhận** — 2 ảnh `glass-backdrop-*` nhận làm mốc sau khi người duyệt xem (2026-10-30) |

---

## 2. Cách đo

| Đại lượng | Lệnh | Điều kiện |
| :-- | :-- | :-- |
| Vi phạm + STATS | `npm run check:design` | Toàn bộ `src/**/*.tsx` (trừ test, `PerfHUD.tsx`) và `src/index.css` |
| Ảnh giao diện | `VISUAL_THRESHOLD=<tỷ lệ> npm run test:visual` (bỏ trống = "không đổi": ≤ 600 px nhiễu) | Mock, `?vectors=8000&nofx`, reduce motion, 1440×900 (mobile 390×844), canvas + PerfHUD bị ẩn (`e2e/visual.css`), `pipeline-status` bị che |
| Hiệu năng | `BROWSER_CHANNEL=chromium node scripts/perf-chat-benchmark.cjs 'http://127.0.0.1:5196/?vectors=150000&bench&perf'` | Dev server mock **cổng riêng, gắn IPv4** (`VITE_USE_MOCK=true npx vite --host 127.0.0.1 --port 5196 --strictPort`), headless Chromium không vsync, Apple M4, 3 lần, lấy median; khi so hai phiên bản thì dựng phiên bản cũ ở worktree và chạy **lần lượt** trên cùng cổng 5197, mỗi lúc một server (hai server song song dùng chung cache `.vite` → hai bản React) |
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

### P18 — Quy đổi thang giá trị

- **Sai khác ảnh (ngưỡng 1.5 %, 1440×900 = 1.296.000 px):** 01 5.974 · 02 902 · 03 27.156 (2.1 %) · 04 54.493 (4.2 %) · 05 12.325 · 06 2.500 · 07 5.118 · 08 3.094 px. 03/04 vượt ngưỡng vì đổi cỡ chữ theo vai trò làm văn bản dài xuống dòng lại; không có phần tử nào lệch bố cục.
- **Hiệu năng (3 lần):** median 2.2 / 2.1 / 2.1 ms; p95 3.4 ms; long task 4 / 4 / 4.

### P19 — Component `Glass`

- **Lớp backdrop-filter** (test `backdrop-filter layers per state`): đăng nhập 7 → 3, lịch sử 5 → 3, trả lời 10 → 9.
- **Hiệu năng A/B xen kẽ (127.0.0.1, cổng riêng):** P19 median 2.0 / 2.0 / 2.1 ms, p95 3.5 ms, 4 long task; P18 (worktree `57224a6`) median 2.0 ms, p95 3.6 ms, 4 long task.
- **Sự cố đo:** hai lượt đầu trúng dev server khác trên `127.0.0.1:5174` (không mock) → số đo sai (median 4–19 ms), đã xoá; xem `ASSUMPTIONS.md` [P19].
- **Animation opacity × `::before`:** không thấy mất blur ở giữa `chat-in`, nhưng nền phía sau tối — cần xem tay.

### P20 — Toán Web3D bằng số phức

- Chi tiết bench, độ chính xác và ảnh 3D: [`trig-audit.md`](trig-audit.md) §7.
- Frame time A/B tuần tự (P19 ↔ P20): 2.2 / 2.1 / 2.1 ms ↔ 2.1 / 2.2 / 2.2 ms.

### P21 — Liquid Glass Cấp 2

- **Đo khi di chuột** (script riêng: 150k vector, chuột chạy vòng tròn 360 bước, 880 khoảng rAF, headless không vsync, server mock `127.0.0.1:5197`, 3 lượt xen kẽ):

| Phương án | Cấp 1 median / p95 | Cấp 3 median / p95 |
| :-- | :-- | :-- |
| Ghi `--lg-light-x/y` lên `<html>` | 2.6 / 3.7 ms | 2.9–3.0 / 6.4–6.7 ms |
| Ghi theo bề mặt (`@property inherits: false`) | 2.6–2.7 / 3.7–3.8 ms | 2.9–3.0 / 6.6–7.0 ms |
| + `will-change: transform` trên `::after` | 2.6–2.7 / 3.7 ms | **2.5 / 4.4–5.1 ms** |
| Chuột đứng yên (đối chứng) | 2.6–2.7 / 3.6 ms | 2.6 / 3.6–3.7 ms |

- **Lỗi blur do `mix-blend-mode`:** thử nghiệm A/B trên panel Cài đặt — có `plus-lighter` thì legend phía sau lộ rõ (527 px khác), bỏ đi thì mờ đúng.

### P22 — Liquid Glass Cấp 3

- **Lỗi P19 (blur ở `::before`)** — đo độ lệch chuẩn độ sáng vùng trống cột chat trên nền sọc (≈ 4 = mờ, 80 = sọc rõ), 5 lần mỗi cấu hình:

| Cấu hình | 5 lần |
| :-- | :-- |
| Cấp 1, blur ở `::before` | 80 · 3.7 · 80 · 80 · 80 |
| Cấp 3, blur ở `::before` | 80 · 80 · 80 · 80 · 80 |
| Cấp 3, blur trên phần tử (đã sửa) | 6.1 × 5 (dải khúc xạ ở mép) |
| Cấp 1, blur trên phần tử (đã sửa) | 3.7 × 5 |

- **Hiệu năng khi di chuột** (median / p95, 3 lượt xen kẽ):

| | Cấp 1 | Cấp 2 | Cấp 3 có chroma 0.5px | Cấp 3 chroma 0 |
| :-- | :-- | :-- | :-- | :-- |
| ms | 2.5–2.7 / 3.6–4.0 | 2.4–2.5 / 4.1–4.9 | 4.3–4.6 / 5.6–6.7 | **2.5 / 4.4–5.0** |

- **FCP/LCP** (build production, 5 lần): cấp 1 median 232 / 248 ms; cấp 3 244 / 244 ms.

