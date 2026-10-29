# AGENTS.md — Frontend AI Agent Operating Manual (`frontend_rag`)

- **Motivation/Background**: `frontend_rag` combines a 100+ FPS procedural 3D WebGL Knowledge Tree (`React Three Fiber` / `Three.js` / custom GLSL shaders) with an Offline-First scientific RAG chat interface (`React 19`, `Zustand`, `Dexie.js` IndexedDB, `KaTeX` math rendering, and SSE token streaming). AI agents modifying `frontend_rag` need explicit rules on the R3F reconciler boundary, main-thread streaming deferral, and IndexedDB synchronization.
- **Purpose**: Provide AI coding agents with the complete component/store directory, 3D WebGL performance guardrails, Offline-First state synchronization rules, and verification commands for `frontend_rag`.
- **Overview Pipeline**: User Interaction / Query → `useSessionStore` (`Dexie.js` Cache-First write + background `/api/v1/chat-sessions` sync) → `useRagStore` (`POST /api/v1/rag/chat/stream` with `30ms` micro-batched token buffer) → Deferred `Markdown.tsx` (`useDeferredValue` + `KaTeX`) + 3D `WorldCanvas.tsx` (`TopKThreads` & `VectorCanopy` shader activation).
- **Detailed Plan**: Section 1 maps the `src/` Directory Structure; Section 2 enforces the 8 Non-Negotiable Frontend & WebGL Invariants; Section 3 summarizes State Stores & Offline Persistence; Section 4 lists Typecheck, Vitest, and Performance Benchmark Commands.
- **References**: [../AGENTS.md](../AGENTS.md), [../docs/INDEX.md](../docs/INDEX.md), [docs/STATE_AND_STREAMING_ARCHITECTURE.md](docs/STATE_AND_STREAMING_ARCHITECTURE.md), [docs/perf-chat-report.md](docs/perf-chat-report.md), [docs/perf-report.md](docs/perf-report.md), [../docs/FE_DESIGN_SYSTEM.md](../docs/FE_DESIGN_SYSTEM.md), [../docs/FE3d_prompt_v2.md](../docs/FE3d_prompt_v2.md), [../docs/AI_chat_log/Vuong_chat_logs.md](../docs/AI_chat_log/Vuong_chat_logs.md).
- **Created**: 2026-10-20T19:00:00+07:00
- **Last Updated**: 2026-10-29T23:55:00+07:00

[STATUS: ACTIVE]

---

## 1. Frontend Directory & Component Map (`frontend_rag/src/`)

| Path | Subsystem | Key Files & Responsibilities |
| :--- | :--- | :--- |
| [`src/App.tsx`](src/App.tsx) & [`src/main.tsx`](src/main.tsx) | **Entrypoint & Layout Shell** | Mounts `AppShell.tsx`, starts parallel `WorldCanvas` preload, and defers heavy procedural world initialization to `requestAnimationFrame` for `LCP < 2.5s` (`D-014`). |
| [`src/store/`](src/store/) | **Zustand State Stores** | [`ragStore.ts`](src/store/ragStore.ts) (active RAG query flight, `30ms` streaming token buffer, 3D camera/highlight state), [`sessionStore.ts`](src/store/sessionStore.ts) (multi-turn chat sessions, `Dexie.js` Cache-First persistence, background backend sync, offline detection). |
| [`src/db/`](src/db/) | **IndexedDB Persistence (`Dexie.js`)** | [`chatDb.ts`](src/db/chatDb.ts) defines client-side `sessions` and `messages` tables keyed by UUIDv7 so chat history survives page reloads and complete backend outages (`D-017`). |
| [`src/api/`](src/api/) | **HTTP & SSE Client** | [`client.ts`](src/api/client.ts) handles REST calls to `/api/v1/*`, SSE stream parsing (`/api/v1/rag/chat/stream`), and JWT Bearer headers. |
| [`src/components/chat/`](src/components/chat/) | **Chat & Citation UI** | [`ChatPanel.tsx`](src/components/chat/ChatPanel.tsx) (prompt input, streaming bubbles, offline badge `Ngoại tuyến`), [`HistoryDrawer.tsx`](src/components/chat/HistoryDrawer.tsx) (`+ Đoạn chat mới`, auto-titled sessions, 2-step trash delete confirmation), [`Markdown.tsx`](src/components/chat/Markdown.tsx) (`useDeferredValue`, `remark-math`, `rehype-katex`, interactive `[Paper: id]` citations). |
| [`src/components/world/`](src/components/world/) | **3D WebGL Scene (`R3F`)** | [`WorldCanvas.tsx`](src/components/world/WorldCanvas.tsx) (`dpr={1.15}`, `antialias: false`, `stencil: false`), [`canopy/VectorCanopy.tsx`](src/components/world/canopy/VectorCanopy.tsx) & [`canopy/canopyShader.ts`](src/components/world/canopy/canopyShader.ts) (150k point cloud with early vertex frustum clipping), [`tree/Branches.tsx`](src/components/world/tree/Branches.tsx) (single merged mesh), [`fx/TopKThreads.tsx`](src/components/world/fx/TopKThreads.tsx) (batched `THREE.LineSegments`), [`overlay/PerfHUD.tsx`](src/components/world/overlay/PerfHUD.tsx) (`PerfSampler` inside Canvas + HTML `PerfHUD` outside Canvas). |
| [`src/utils/`](src/utils/) | **Utilities** | [`uuid.ts`](src/utils/uuid.ts) (client-side RFC 9562 UUIDv7 generator matching backend schema). |

---

## 2. Eight Non-Negotiable Frontend & WebGL Invariants

1. **R3F Reconciler Boundary (`D-013`)**:
   - **Never** render raw HTML DOM elements (`<div>`, `<span>`, `<p>`) inside `<Canvas>` in [`WorldCanvas.tsx`](src/components/world/WorldCanvas.tsx). Doing so crashes React Three Fiber with `R3F: <Tag> is not part of the THREE namespace!`.
   - Always follow the [`PerfHUD.tsx`](src/components/world/overlay/PerfHUD.tsx) pattern: put a renderless Three.js hook component (`PerfSampler` returning `null`) inside `<Canvas>`, and mount the HTML DOM overlay (`PerfHUD`) as a sibling **outside** `<Canvas>`.
2. **Streaming Markdown Main-Thread Protection (`D-005`)**:
   - Streaming tokens from `/api/v1/rag/chat/stream` must be accumulated in the `30ms` micro-batch buffer inside [`ragStore.ts`](src/store/ragStore.ts) and rendered through `useDeferredValue` in [`Markdown.tsx`](src/components/chat/Markdown.tsx). Never run synchronous Remark/KaTeX AST parsing on every single raw SSE chunk.
3. **Offline-First Cache-First Chat Persistence (`D-017`)**:
   - [`chatDb.ts`](src/db/chatDb.ts) (`Dexie.js` IndexedDB) is the primary source of truth for the UI. Every new session creation, user prompt, streamed assistant reply, rename, or deletion must commit to IndexedDB **first**, and then synchronize asynchronously with `/api/v1/chat-sessions` in the background without blocking UI rendering if the backend is offline.
4. **3D Draw Call & Fill-Rate Budget (`D-006` – `D-011`)**:
   - Keep `Branches.tsx` as a single merged mesh (1 draw call, `D-009`) and `TopKThreads.tsx` as a single batched `THREE.LineSegments` geometry with vertex colors (`D-006`).
   - Preserve early vertex frustum clipping ($mv.z \ge -0.1$ and $|clip.x|, |clip.y| > 1.25w$) and `uAlphaCut = 0.08` in [`canopyShader.ts`](src/components/world/canopy/canopyShader.ts) (`D-007`, `D-011`).
   - Keep `frustumCulled={true}` with valid bounding spheres on all world and particle meshes (`D-008`).
5. **Core Web Vitals Budget (`LCP < 2.5s`, `FCP < 1.0s`, Lighthouse `97+`, `D-014`, `D-018`)**:
   - Keep KaTeX CSS imported lazily inside [`Markdown.tsx`](src/components/chat/Markdown.tsx) (never in the critical global `index.css`), keep Google Fonts non-blocking (`display=swap`), and preserve the pre-rendered HTML shell in [`index.html`](index.html).
6. **Unicode NFC Normalization for Vietnamese Text (`D-018`)**:
   - Always ensure Vietnamese UI strings (e.g., `+ Đoạn chat mới`, `Ngoại tuyến`, `Xóa?`, `Huỷ`) use composed **Unicode NFC** normalization to avoid detached diacritic rendering on Windows.

7. **Design Tokens Only (`FE_DESIGN_SYSTEM.md`)**:
   - Before any UI change read [`../docs/FE_DESIGN_SYSTEM.md`](../docs/FE_DESIGN_SYSTEM.md) and [`src/theme/tokens.ts`](src/theme/tokens.ts). Colors, radius, blur, alpha, font sizes and motion come from tokens only — no hex/`rgba()` in components, no Tailwind palette colors (`red-500`, `text-white`…), no raw arbitrary values (`rounded-[12px]`, `text-[11px]`), no new CSS variables.
   - Run `npm run check:design` (report) and `npm run test:visual` (screenshots vs. baseline) for every UI change; refresh baselines only after a human reviewed the diff. Migration plan: [`../docs/FE3d_prompt_v2.md`](../docs/FE3d_prompt_v2.md).
8. **Rotation Math via Complex Numbers / Quaternions (`FE_DESIGN_SYSTEM.md` §9)**:
   - Rotations use [`src/utils/rotation.ts`](src/utils/rotation.ts) (`makeRotor`, `rotateComplex`, `mulRotor`, `stepRotation`, `slerpQuat`). `Math.sin/cos` only build rotors or appear in the measured exceptions of [`docs/trig-audit.md`](docs/trig-audit.md), annotated `// trig-ok: <reason>`. No Euler-angle animation.

---

## 3. Verification & Benchmark Commands (`frontend_rag/`)

```powershell
# 1. TypeScript strict typecheck (must exit with 0 errors)
npm run typecheck

# 2. Run Vitest unit & component test suite (202+ tests with fake-indexeddb)
npm test -- --run

# 3. Production bundle build
npm run build

# 4. Realtime WebGL + Chat Streaming FPS & LongTask Benchmark
#    (defaults to Edge; on macOS/Linux: BROWSER_CHANNEL=chromium)
npm run test:perf

# 5. Design-token guard and UI screenshot regression
npm run check:design
npm run test:visual
```

> On Node ≥ 25 run Vitest with `NODE_OPTIONS=--no-experimental-webstorage` (Node's own `localStorage` shadows jsdom's; see `ASSUMPTIONS.md` [P15]).

For a deep architectural walkthrough of `ragStore`, `sessionStore`, `Dexie.js` synchronization, and SSE token streaming, read [`docs/STATE_AND_STREAMING_ARCHITECTURE.md`](docs/STATE_AND_STREAMING_ARCHITECTURE.md).
