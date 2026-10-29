# PROGRESS.md — Frontend Feature Implementation & Verification Tracker (`frontend_rag`)

- **Motivation/Background**: Tracks prompt-by-prompt implementation progress, test verification counts, performance benchmarks, and post-P14 milestones across `frontend_rag`.
- **Purpose**: Provide engineers and AI coding agents with an auditable record of completed frontend prompts (`P1`–`P14.1` and subsequent milestones), passing unit/E2E suites, and open items.
- **Overview Pipeline**: Prompt Execution → Unit & E2E Test Verification (`Vitest` + `Playwright`) → GPU/Frame-Time Audit → Progress Table Update.
- **Detailed Plan**: Tracks P1–P11 core 3D world & chat verification, trigonometric & WebGL performance audits, P12/P14.1 knowledge crawl streams, UI consolidation, and 2026-10-20 → 2026-10-30 full-stack/offline-first & cross-platform E2E milestones.
- **References**: [AGENTS.md](AGENTS.md), [ASSUMPTIONS.md](ASSUMPTIONS.md), [../docs/INDEX.md](../docs/INDEX.md), [../docs/prompt_fe_3d.md](../docs/prompt_fe_3d.md), [../docs/FE_DESIGN_SYSTEM.md](../docs/FE_DESIGN_SYSTEM.md), [../docs/FE3d_prompt_v2.md](../docs/FE3d_prompt_v2.md), [docs/STATE_AND_STREAMING_ARCHITECTURE.md](docs/STATE_AND_STREAMING_ARCHITECTURE.md).
- **Created**: 2026-10-19T10:00:00+07:00
- **Last Updated**: 2026-10-30T06:12:00+07:00

[STATUS: ACTIVE]

---

Trạng thái: **P1–P14.1 + Offline-First IndexedDB & Auth/Session Sync hoàn tất (`210/210` Vitest, `6/6` Playwright E2E)**. Cập nhật 2026-10-30.

| Prompt | Module | Kiểm chứng | Kết quả |
| :-- | :-- | :-- | :-- |
| P1 | Types, theme Light/Dark | `tsc --noEmit` 0 lỗi; `tokens.test.ts` | ✅ 5/5 |
| P2 | Parser binary, SSE, client, mock world/chat | `vectorParser`, `sseParser`, `mockWorld`, `mockChat` tests | ✅ 25/25 |
| P3 | Store + máy trạng thái | `pipeline.test.ts`, `ragStore.test.ts`, `worldStore.test.ts`, `uiStore.test.ts` | ✅ 23/23 |
| P4 | Chat UI, Markdown + KaTeX, chip trích dẫn | `chat.test.tsx`, `markdownMath.test.ts` (2 chip, KaTeX block, không XSS, tooltip unverified) | ✅ 23/23 |
| P5 | Canvas, camera 5 mode, bloom, đom đóm | `cameraPresets`/`lod` tests (`utils.test.ts`); ảnh chụp 2 theme | ✅ |
| P6 | Lưới ô + thùng sách + legend | `groundLayout` tests (`utils.test.ts`); ảnh mode "Dưới đất" (nhìn xuyên thấy thùng + rễ) | ✅ |
| P7 | Rễ, thân gân sáng, cành, nhựa sống | `treeGeometry` tests (`utils.test.ts`); rễ+thân/cành+hạt = 3 draw call | ✅ |
| P8 | Tán lá 1 `THREE.Points` | `canopy` tests (`utils.test.ts`, `perf.test.ts`); 150.000 vector ≈ 60 FPS (Apple M4, vsync) | ✅ |
| P9 | Animation hỏi đáp 6 giai đoạn | `flight` tests (`utils.test.ts`); ảnh từng giai đoạn; nprobe=3 tách 9 quả cầu; skip; câu mới | ✅ |
| P10 | ResultCard, PaperPanel 3 trường hợp | `arxiv`, `resultCase`, `result.test.tsx`, `PaperPanel.test.tsx` | ✅ 13/13 |
| P11 | Layout, cài đặt, health, E2E | `npm run build` OK (chunk three/r3f/postprocessing/markdown tách riêng); Playwright a–f | ✅ 6/6 |

Tổng hiện tại (2026-10-30): `npx vitest run` **210/210** (`26/26` test files), `npx playwright test` **6/6**.

## Còn tồn tại
- Thế giới 3D (`/world/*`) và luồng cào (`/crawl/stream`) mặc định chạy `VITE_MOCK_WORLD=true` cho tới khi pipeline offline xuất đủ `data/world/*` (xem `ASSUMPTIONS.md`).
- Bundle `three` ~816 kB (209 kB gzip) — đã tách chunk và lazy-load canvas.

## Rà soát lượng giác (2026-10-19)
- [`docs/trig-audit.md`](docs/trig-audit.md): không có góc Euler; 2 chỗ `Math.sin` chạy mỗi frame trên CPU đã thử thay bằng rotor phức → không cải thiện (6.70 → 6.83 ms/frame, trong nhiễu) → hoàn tác. Nguồn lag chính: bloom (~77% frame) và overdraw sprite vào target MSAA.

## Tối ưu hiệu năng (2026-10-19)
- [`docs/perf-report.md`](docs/perf-report.md): frame time (đo đồng bộ GPU) median 12.7→8.0 ms (dark), 13.3→8.9 ms (light); đã sửa lỗi FXAA làm vệt tím trên Safari trên Apple M4 @150k; SwiftShader 189→113 ms (Cao), 83 ms (Tự động); raycast ÷12–17; cập nhật state ÷27. Thêm Chất lượng Tự động/Cao/Thấp.

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
| Frame time trước/sau | [`docs/perf-report.md`](docs/perf-report.md) §10 |

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

## Giai đoạn 2026-10-20 → 2026-10-30 (Full-Stack Integration, Offline-First IndexedDB & P1–P11 Verification)
| Hạng mục | Kiểm chứng | Kết quả |
| :-- | :-- | :-- |
| Nối backend `RAG_TS` (`/api/v1/*`), Auth (`AuthOverlay`, `authStore`) & trích dẫn đa định dạng (OpenAlex / arXiv) | `clientLive.test.ts`, `worldBridge.test.ts`, `chat.test.tsx` | ✅ |
| Tối ưu hiệu năng stream chat + 3D (`30ms` token batching, `useDeferredValue`, `PerfHUD`) | [`docs/perf-chat-report.md`](docs/perf-chat-report.md), `perf.test.ts` | ✅ |
| Lưu trữ Offline-First bằng `Dexie.js` IndexedDB (`chatDb.ts`), `HistoryDrawer`, đồng bộ 2 chiều `/chat-sessions` | `sessionStore.test.ts`, `HistoryDrawer.test.tsx` | ✅ |
| Đồng bộ `MessageBubble` typewriter (`useReveal`) theo `visualPhase` và hỗ trợ Playwright đa nền tảng (Windows/macOS) | `npx tsc --noEmit` (0 lỗi), `npx vitest run` (**210/210**), `npm run build` (OK), `npx playwright test` (**6/6**) | ✅ |
