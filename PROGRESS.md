# PROGRESS

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
