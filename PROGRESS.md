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

Tổng: `npx vitest run` **72/72**, `npx playwright test` **6/6**.

## Còn tồn tại
- Chưa chạy với backend thật: các endpoint `/api/world/*`, `/api/papers/:id`, `/api/rag/chat/stream` (SSE theo Mục 3.8) chưa có ở `backend_rag` (Phụ lục A).
- Ngân sách FPS mới đo trên Apple M4 (headless Chromium, Metal); chưa đo trên laptop GPU tích hợp.
- Bundle `three` ~816 kB (209 kB gzip) — đã tách chunk và lazy-load canvas.
- `AGENTS.md` trong repo vẫn là ghi chú cũ của Next.js (không còn đúng).
