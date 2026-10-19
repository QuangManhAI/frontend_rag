# Cây Tri Thức Vector — Frontend 3D cho RAG

Một **cây cổ thụ tri thức** mọc lên từ kho tài liệu: thùng sách dưới đất (kho bài báo), rễ (embedding), thân & cành (index phân cấp k-means), và tán lá — **mỗi điểm sáng là một vector bài báo**. Khi hỏi, câu hỏi tan thành một quả cầu vector, bay theo cành (điểm cosine thật ở mỗi ngã rẽ), so sánh với các vector ứng viên, sáng rực top-k, rồi camera phóng vào kết quả tốt nhất trong lúc LLM viết câu trả lời.

Spec gốc: [`../docs/prompt_frontend.md`](../docs/prompt_frontend.md) — hợp đồng dữ liệu ở **Mục 3**.

Stack: Vite 6 · React 19 · TypeScript (strict) · three.js · @react-three/fiber + drei + postprocessing · zustand · react-markdown + KaTeX · Tailwind 4 · Vitest · Playwright.

## Chạy

```bash
npm install
npm run dev            # http://localhost:3000 — mặc định chạy mock, không cần backend
```

| Biến (`.env`) | Mặc định | Ý nghĩa |
| :-- | :-- | :-- |
| `VITE_USE_MOCK` | `true` | `false` để gọi backend thật |
| `VITE_API_BASE` | `/api` | Tiền tố API |
| `VITE_BACKEND_URL` | `http://localhost:8000` | Đích proxy `/api` của `vite dev` |

Query string hữu ích:

| Query | Tác dụng |
| :-- | :-- |
| `?vectors=150000` | Thế giới mock 150k vector (test hiệu năng) |
| `?perf` | Overlay r3f-perf (chỉ DEV) |
| `?nofx` | Tắt bloom (GPU yếu / CI) |
| `?mockHealth=down` | Giả lập LLM mất kết nối (banner cảnh báo) |

Trong chat mock: gõ câu chứa `/error` để giả lập lỗi stream. Câu trả lời mock luôn có 1 trích dẫn **ngoài ngữ cảnh** để thấy chip cảnh báo.

## Test

```bash
npm test               # Vitest: 72 unit + component tests
npx playwright install chromium   # lần đầu
npm run test:e2e       # Playwright: 6 kịch bản E2E (tự bật dev server mock ở cổng 5198)
npm run typecheck
npm run build
```

## Thao tác

- **Toàn cảnh / Tán cây / Dưới đất** (thanh trên): chuyển camera; "Dưới đất" làm mặt đất trong suốt để thấy thùng sách và rễ.
- **Click ô đất** hoặc **loại bài trong legend**: chỉ làm sáng vector thuộc thùng/loại đó. `Esc` để bỏ lọc.
- **Thanh năm**: ẩn bài xuất bản sau năm chọn, nút ▶ để xem cây "mọc lá" theo thời gian.
- **Hover điểm sáng**: tooltip (tiêu đề tải lười sau 300ms). **Click**: bay tới bài, mở panel chi tiết.
- **Chip trích dẫn** trong câu trả lời: bay tới vector của bài; chip viền vàng nét đứt = bài LLM trích nhưng không nằm trong ngữ cảnh.
- **Cài đặt**: `top_k` (1–20), `nprobe` (1–6, quả cầu tách vào nhiều cành hơn), lọc loại bài, authority boost, query expansion, giảm chuyển động.

## Cấu trúc

```text
src/
├── types/           world.ts, rag.ts — đúng Mục 3 (snake_case)
├── theme/           tokens.ts (dark/light, 12 màu category), applyCssVars.ts, useTheme.ts
├── api/             client.ts, vectorParser.ts (vectors.bin), sseParser.ts, mock/ (rng, mockWorld, mockChat)
├── store/           pipeline.ts (reducer thuần), ragStore, worldStore, uiStore, fxStore
├── utils/           hàm thuần có test: flight, canopy, groundLayout, treeGeometry, cameraPresets, citations, arxiv, resultCase…
└── components/
    ├── chat/        ChatPanel, MessageList, MessageBubble, ChatInput, CitationChip, PipelineStatus, Markdown
    ├── world/       WorldCanvas, SkyBackground, Lighting, PostFX, CameraDirector
    │   ├── ground/  GroundGrid, BookCrates
    │   ├── tree/    AncientTree, Roots, Trunk, Branches, SapFlow, BranchLabels
    │   ├── canopy/  VectorCanopy (+ picker), canopyShader, VectorTooltip
    │   ├── fx/      QueryFlight (điều phối), QueryOrb, QueryText, VectorDigits, RouteScores, CompareThreads, TopKThreads, EssenceFlow, Fireflies
    │   └── overlay/ anchors (DOM overlay + projector), WorldOverlay, CompareScoreLabel
    ├── result/      ResultCard, PaperPanel, ChunkList, ScoreBars, TopKBadges
    └── layout/      AppShell, TopBar, ThemeToggle, SettingsPanel, HealthBanner, LoadingTree, CategoryLegend, YearSlider
e2e/knowledge-tree.spec.ts
```

Nguyên tắc: logic tách khỏi render (mọi tính toán là hàm thuần có test), animation chỉ dùng ref + `useFrame`, store chỉ đổi ở ranh giới giai đoạn. Xem `ASSUMPTIONS.md` cho các quyết định ngoài spec và `PROGRESS.md` cho trạng thái kiểm chứng.

## Nối backend thật

Đặt `VITE_USE_MOCK=false`. Backend cần cung cấp (Phụ lục A của spec): `GET /api/world/{categories,ground,tree,vectors.bin,vector-ids}`, `GET /api/papers/:paper_id`, `POST /api/rag/chat/stream` (SSE với các event `phase/route/compare/retrieval/token/done/error`), `GET /api/rag/health` → `{ lancedb, llm, world }`.
