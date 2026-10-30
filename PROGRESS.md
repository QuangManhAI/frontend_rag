# PROGRESS.md — Nhật ký tiến độ Frontend `frontend_rag`

- **Motivation/Background**: Mỗi prompt (P1–P14 trong [`../docs/prompt_fe_3d.md`](../docs/prompt_fe_3d.md), P15+ trong [`../docs/FE3d_prompt_v2.md`](../docs/FE3d_prompt_v2.md)) phải ghi lại kết quả kiểm chứng để người duyệt dò vết.
- **Purpose**: Bảng tiến độ theo prompt: module, kiểm chứng, kết quả, vấn đề tồn tại.
- **Overview Pipeline**: Cập nhật cuối mỗi prompt sau khi chạy mục "Kiểm chứng".
- **Detailed Plan**: P1–P11 (mock); rà soát lượng giác; tối ưu hiệu năng; P12–P14.1; giao diện gọn; giai đoạn 2026-10-20 → 2026-10-28 (không có spec); P15+ (Design System).
- **References**: [`ASSUMPTIONS.md`](ASSUMPTIONS.md), [`docs/design-migration-report.md`](docs/design-migration-report.md), [`../docs/FE_DESIGN_SYSTEM.md`](../docs/FE_DESIGN_SYSTEM.md).
- **Created**: 2026-10-19T18:48:02+07:00
- **Last Updated**: 2026-10-30T10:45:00+07:00

[STATUS: ACTIVE]

---

Trạng thái: **P1–P11 xong ở chế độ mock** (chưa nối backend thật). Cập nhật 2026-10-19.

| Prompt | Module | Kiểm chứng | Kết quả |
| :-- | :-- | :-- | :-- |
| P1 | Types, theme Light/Dark | `tsc --noEmit` 0 lỗi; `tokens.test.ts` | ✅ 4/4 |
| P2 | Parser binary, SSE, client, mock world/chat | `vectorParser`, `sseParser`, `mockWorld`, `mockChat` tests | ✅ 24/24 |
| P3 | Store + máy trạng thái | `pipeline.test.ts` | ✅ 7/7 |
| P4 | Chat UI, Markdown + KaTeX, chip trích dẫn | `chat.test.tsx` (2 chip, KaTeX block, không XSS, tooltip unverified) | ✅ 6/6 |
| P5 | Canvas, camera 5 mode, bloom, đom đóm | `cameraPresets`/`lod` tests; ảnh chụp 2 theme | ✅ |
| P6 | Lưới ô + thùng sách + legend | `groundLayout` tests; ảnh mode "Dưới đất" (nhìn xuyên thấy thùng + rễ) | ✅ |
| P7 | Rễ, thân gân sáng, cành, nhựa sống | `treeGeometry` tests; rễ+thân/cành+hạt = 3 draw call | ✅ |
| P8 | Tán lá 1 `THREE.Points` | `canopy` tests; 150.000 vector ≈ 60 FPS (Apple M4, vsync) | ✅ |
| P9 | Animation hỏi đáp 6 giai đoạn | `flight` tests; ảnh từng giai đoạn; nprobe=3 tách 9 quả cầu; skip; câu mới | ✅ |
| P10 | ResultCard, PaperPanel 3 trường hợp | `arxiv`, `resultCase`, `PaperPanel.test.tsx` | ✅ 3/3 |
| P11 | Layout, cài đặt, health, E2E | `npm run build` OK (chunk three/r3f/postprocessing/markdown tách riêng); Playwright a–f | ✅ 6/6 |

Tổng: `npx vitest run` **99/99**, `npx playwright test` **6/6**.

## Còn tồn tại
- Chưa chạy với backend thật: các endpoint `/api/world/*`, `/api/papers/:id`, `/api/rag/chat/stream` (SSE theo Mục 3.8) chưa có ở `backend_rag` (Phụ lục A).
- Ngân sách FPS mới đo trên Apple M4 (headless Chromium, Metal); chưa đo trên laptop GPU tích hợp.
- Bundle `three` ~816 kB (209 kB gzip) — đã tách chunk và lazy-load canvas.
- `AGENTS.md` trong repo vẫn là ghi chú cũ của Next.js (không còn đúng).

## Rà soát lượng giác (2026-10-19)
- `docs/trig-audit.md`: không có góc Euler; 2 chỗ `Math.sin` chạy mỗi frame trên CPU đã thử thay bằng rotor phức → không cải thiện (6.70 → 6.83 ms/frame, trong nhiễu) → hoàn tác. Nguồn lag chính: bloom (~77% frame) và overdraw sprite vào target MSAA.

## Tối ưu hiệu năng (2026-10-19)
- `docs/perf-report.md`: frame time (đo đồng bộ GPU) median 12.7→8.0 ms (dark), 13.3→8.9 ms (light); đã sửa lỗi FXAA làm vệt tím trên Safari trên Apple M4 @150k; SwiftShader 189→113 ms (Cao), 83 ms (Tự động); raycast ÷12–17; cập nhật state ÷27. Thêm Chất lượng Tự động/Cao/Thấp.

## P12 — Luồng tri thức khi cào (2026-10-19)
| Kiểm chứng | Kết quả |
| :-- | :-- |
| Bật mock crawl: dòng màu chảy từ tầng nguồn lên đúng thùng cùng màu; thùng cao dần; ô đất nhấp sáng | ✅ (ảnh `docs/perf-shots/crawl-streams.jpg`) |
| "Hiện hạt lên cây": hạt theo rễ của thùng → thân → nhánh; vector mới mọc trên tán | ✅ (597 vector thêm trong 13 s ở 3.000/phút) |
| Tắt mock crawl: tắt dần, draw call trở về như cũ | ✅ 41.8 → 41.8 (dark), 40.7 → 40.7 (light) |
| 3.000 bài/phút: không vượt pool, frame time trong ngân sách | ✅ pool ~9.200/20.000; frame median 8.8–9.6 ms (M4, đo đồng bộ) |
| Mất kết nối: HUD báo, tự kết nối lại | ✅ (mock "Giả lập mất kết nối") |
| Unit test `crawlFlow.test.ts`, `crawlClient.test.ts` | ✅ |
| Backend `GET /api/crawl/stream` | ⏳ chưa có (Phụ lục 12.5) — đang chạy bằng mock |

## P14.1 — Cáp tri thức (2026-10-20)
| Kiểm chứng | Kết quả |
| :-- | :-- |
| Góc overview: thấy rõ từng dòng hạt màu đi lên từ mép dưới màn hình (ống đã bỏ theo góp ý) | ✅ cả dark và light (`docs/screenshots/after-*-overview.png`) |
| Xung năng lượng chạy lên, khối "dâng sáng" khi xung tới | ✅ mỗi cáp có xung tới trong 0.4–2.3 s gần nhất (đọc `crawlFx.zoneRise`); ảnh chuỗi khung hình |
| Khối là kính trong suốt liền mảng, thấy cáp cắm vào đáy | ✅ (`docs/screenshots/after-*-ground.png`) |
| Mock crawl: cáp của khối đang nhận bài khác hẳn | ✅ nhiều vệt hơn, sáng hơn, xung dày hơn, vệt nhanh hơn theo `count` (rõ nhất ở 300 bài/phút khi chỉ vài vùng nhận bài cùng lúc) |
| Reduce motion: không xung, không hạt (khối vẫn phản ứng) | ✅ |
| Mức Thấp: ít hạt hơn (12 thay vì 40 vệt/s/dòng) | ✅ |
| Cây không đổi (`src/components/world/tree/` không sửa) | ✅ |
| Unit test (`feedCables.test.ts` mới) | ✅ 190/190 |
| Frame time trước/sau | `docs/perf-report.md` §10 |

## Giao diện gọn (2026-10-20)
| Kiểm chứng | Kết quả |
| :-- | :-- |
| Chỉ còn giao diện tối, không nút đổi theme | ✅ (E2E b) |
| Không còn nút Toàn cảnh / Tán cây / Dưới đất | ✅ (E2E b) |
| Thanh năm nằm trong Cài đặt | ✅ (E2E b) |
| Nhãn nhánh mặc định tắt, bật trong Cài đặt | ✅ (E2E b) |
| Bảng cào dữ liệu nằm trong Cài đặt | ✅ (E2E b) |
| Unit + E2E | ✅ 187/187, 6/6; `npm run build` sạch |

## Hoạt cảnh tìm kiếm chậm & dịu mắt (2026-10-20)
| Kiểm chứng | Kết quả |
| :-- | :-- |
| Thanh năm nằm trong Cài đặt | ✅ (E2E b) |
| Chuỗi tìm kiếm chậm lại | ✅ ~25 s từ lúc hỏi tới "Xong" với mock (trước ~17.5 s) |
| Không cháy trắng khi camera bám quả cầu | ✅ tán mờ 90% khi bay/so sánh (ảnh kiểm tra) |
| Không giật | ✅ M4, bản build 150k, 1440×900: 0–1% khung > 25 ms ở mọi giai đoạn (2 lượt đo) |
| Sau khi tìm xong: camera về góc ban đầu, tán mờ, rank nổi bật | ✅ (E2E c: camera `overview`, `dim = 1`, có huy hiệu #1) |
| Unit + E2E | ✅ 188/188, 6/6 |

## Giai đoạn 2026-10-20 → 2026-10-28 (bổ sung từ `git log`, không có spec)
| Chủ đề | Commit | Ghi chú |
| :-- | :-- | :-- |
| Hiệu năng 3D/FPS, PerfHUD | `199c14e`, `b368cc5`, `718b049`, `e8cb552`, `20026ee`, `0888b74`, `f6300f8` | Báo cáo: [`docs/perf-chat-report.md`](docs/perf-chat-report.md) |
| Hiệu năng tải trang (LCP/FCP) | `9457e1c` | [`docs/perf-report.md`](docs/perf-report.md) |
| TopK badge, mock chat | `181761e`, `86e72c5` | |
| Auth "Liquid Glass" | `85b3e35` → `3fdb69e` → `5871b26` → `6fb7906` → `26fa96b` → `85962c2` | Sửa 6 lần, không có spec — xem [`../docs/FE_DESIGN_AUDIT.md`](../docs/FE_DESIGN_AUDIT.md) |
| FPS_LOCK (thêm rồi gỡ) | `f8a483b`, `20a1c26` | |
| tsconfig | `bc48609`, `90e5299` | |
| Intro / loading / WorldError | `050879c`, `1ba3e20`, `538ae7f` | |
| Chat offline (Dexie) + đồng bộ | `7762d3d`, `59f781f`, `d035b48` | [`docs/STATE_AND_STREAMING_ARCHITECTURE.md`](docs/STATE_AND_STREAMING_ARCHITECTURE.md) |

## P15 — Baseline ảnh, check-design & quản trị tài liệu (2026-10-29)
| Kiểm chứng | Kết quả |
| :-- | :-- |
| Không sửa `src/` | ✅ `git diff --stat -- src/` rỗng |
| `npm run test:visual` (8 ảnh, ngưỡng 0) ổn định 2 lần liên tiếp | ✅ 8/8, 8/8 |
| `npm run check:design` khớp audit | ✅ unknown-var: 4 tên (`--ink-secondary`, `--ui-hover`, `--ui-panel-bg`, `--ink-faint`); STATS radius 8 · blur 5 · alpha trắng 12 · cỡ chữ 19 (audit đếm tay ~14 vì bỏ sót `text-[0.65rem]`…) |
| Unit test | ⚠️ 200/210 trên Node 26 (lỗi môi trường `localStorage`, xem ASSUMPTIONS [P15]); ✅ 210/210 với `NODE_OPTIONS=--no-experimental-webstorage` |
| E2E `knowledge-tree.spec.ts` | ⚠️ 5/6. a, b, f pass; d, e pass sau khi E2E nạp sẵn user (form đăng nhập che ô chat từ `3fdb69e`); **c fail sẵn có**: kỳ vọng câu trả lời còn đang chạy chữ khi ResultCard hiện, nhưng câu trả lời đã đủ (1067 ký tự) — chờ người duyệt quyết định |
| Mốc hiệu năng `test:perf` (dev, headless Chromium, 150k) | median frame 2.1 / 2.2 / 2.2 ms; p95 3.4–3.6 ms; long task 4–6 (lúc tải + stream) |

## P16 — Nền tảng token (2026-10-30)
| Kiểm chứng | Kết quả |
| :-- | :-- |
| Token mới: `glassTint/Fill/FillHover/Highlight/HighlightStrong/Lowlight/StrokeStrong`, `uiInkFaint`; CSS alias `--glass-stroke`, `--glass-saturate`, `--glass-edge(-strong)`, `--shadow-panel`, `--glow-accent`, `--dur-*`, `--lg-*` (Cấp 1, tắt) | ✅ |
| Class Tailwind mới `text-micro/caption/control/display`, `ease-standard/spring/scene` được sinh từ `src/index.css` | ✅ (kiểm bằng `@tailwindcss/node`) |
| `contrastRatio` (WCAG): ink ≥ 7, ink-muted ≥ 4.5, ink-faint ∈ [3, 4.5), accent-ink trên accent ≥ 4.5 | ✅ `contrast.test.ts` 6/6 |
| Không đổi pixel (`test:visual`, ngưỡng nhiễu 600 px) | ✅ 8/8 hai lần liên tiếp |
| `check:design` không tăng so với P15 | ✅ (alpha trắng 12 → 14 vì token mới 0.08/0.24 — sẽ gộp ở P18) |
| typecheck, unit, build | ✅ 0 lỗi · 218/218 · build OK |

## P17 — Sửa lỗi lệch token (2026-10-30)
| Kiểm chứng | Kết quả |
| :-- | :-- |
| `check:design:strict --rules=unknown-var,var-fallback,tw-palette,raw-color` | ✅ 0 (trước: 10 · 4 · 8 · 4 dòng) |
| `--ink-faint` được định nghĩa; `--ink-secondary`/`--ui-hover`/`--ui-panel-bg` thay bằng token có sẵn; màu Tailwind (`red/amber/gray/white`) trong ChatPanel, HistoryDrawer → `--danger`/`--warn`/`--ink*`/`--accent-ink` | ✅ |
| `.glass` dùng `--glass-tint`, `--glass-stroke`, `--shadow-panel`, `--glass-edge` (giá trị y hệt) | ✅ `css-raw-color` 20 → 16 |
| `uiBorder` 0.12 → 0.14 (Phụ lục A #1, người duyệt đồng ý) | ✅ dưới ngưỡng phát hiện ở mọi ảnh |
| Xoá CSS/comment theme sáng | ✅ |
| Chữ đọc được: "Xóa?" danger trên danger 16%, badge offline warn trên warn 16%, ink-muted trên hover fill | ✅ `contrast.test.ts` ≥ 4.5 |
| Ảnh: chỉ `06-history-drawer` đổi (1.430 px) | ✅ người duyệt chấp nhận, baseline 06 đã cập nhật |
| Unit, E2E, typecheck | ✅ 221/221 · 6/6 · 0 lỗi |

## P18 — Quy đổi thang giá trị (2026-10-30)
| Kiểm chứng | Kết quả |
| :-- | :-- |
| `check:design:strict --rules=all-except-trig` | ✅ 0 (đã nằm trong `npm run lint`) |
| STATS: bo góc 4 + full · blur 3 · alpha trắng 6 · cỡ chữ 7 (+2 `em`) | ✅ 4 · 3 · 6 · 9 (= 7 + `0.72em`, `0.85em`) |
| `@theme`: `--radius-*: initial` (xs 4 · sm 6 · md 10 · lg 14 · full), `--blur-*: initial` (sm 6 · md 12 · lg 16); `--radius` → alias `--radius-lg` | ✅ `scale.test.ts` |
| `--dur-scene` = `CHAT_SLIDE_S` × 1000 (hằng số chuyển sang `utils/animationConfig.ts`) | ✅ `motionSync.test.ts` |
| Không còn `rounded-xl/2xl/3xl`, `rounded` trần | ✅ (`retired-radius` = 0) |
| Unit, E2E, typecheck, build | ✅ 227/227 · 6/6 · 0 lỗi · OK |
| Frame time (dev, headless, 150k) | ✅ median 2.2 / 2.1 / 2.1 ms (P15: 2.2), p95 3.4 ms |
| Ảnh (ngưỡng 1.5%) | ⚠️ 6/8 trong ngưỡng; `03` 2.1 %, `04` 4.2 % do chữ xuống dòng lại (Markdown 14.4 → 14 px, abstract/đoạn trích 13.1 → 12 px) — người duyệt chấp nhận, 8 baseline đã cập nhật |

## P19 — Component `Glass` (Liquid Glass Cấp 1) (2026-10-30)
| Kiểm chứng | Kết quả |
| :-- | :-- |
| `components/ui/Glass.tsx` (material · shape · nested · interactive · `as`, ref là prop thường của React 19) | ✅ `Glass.test.tsx` 4/4 |
| `.glass` → cấu trúc `::before` (nền + backdrop-filter) / `::after` (specular, ẩn tới P21); `backdrop-filter` chỉ còn ở `::before` | ✅ |
| Chuyển sang `Glass`: TopBar, cột chat, chip lọc, bottom sheet, Settings, Legend, PaperPanel, ResultCard, HealthBanner, 2 tooltip 3D, nút mở chat, chip tên người dùng, emblem/ô nhập/CTA đăng nhập | ✅ `grep liquid- src` = 0, không còn `glass-strong` |
| Kính không chồng kính: số lớp backdrop-filter | ✅ đăng nhập 7 → 3 · lịch sử 5 → 3 · trả lời 10 → 9 |
| Ảnh | ✅ 7/8 ≤ nhiễu; `07` đổi 4.441 px (form đăng nhập: bỏ blur lồng, CTA viền strong) — người duyệt chấp nhận, baseline 07 đã cập nhật |
| Frame time (A/B xen kẽ, cổng riêng `127.0.0.1`) | ✅ P19 median 2.0 / 2.0 / 2.1 ms · P18 2.0 ms (p95 3.5–3.6, 4 long task cả hai) |
| Unit, E2E, lint, build | ✅ 231/231 · 6/6 · 0 vi phạm · OK |

## Còn tồn tại (sau P16)
- E2E c đã sửa theo D-026 (người duyệt chọn "sửa test cho khớp") → `knowledge-tree.spec.ts` 6/6.
- `npm test` cần `NODE_OPTIONS=--no-experimental-webstorage` trên Node ≥ 25.
- `scripts/perf-chat-benchmark.cjs` mặc định dùng Edge (`msedge`); trên macOS chạy với `BROWSER_CHANNEL=chromium`.
- Đo hiệu năng phải dùng cổng riêng và `127.0.0.1` (xem ASSUMPTIONS [P19]): `localhost:5174` có thể trúng dev server khác đang chạy.

