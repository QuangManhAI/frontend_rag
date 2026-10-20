# ASSUMPTIONS

Định dạng: `[P<số prompt>] <giả định> — <lý do>`

- [P1] Dự án dựng tại chỗ trong `frontend_rag/` (đổi tên package thành `rag-knowledge-tree`) thay vì tạo thư mục mới; UI chat cũ (Next.js → Vite) đã bị thay thế, vẫn còn trong lịch sử git — tránh hai frontend song song trong submodule.
- [P1] Dùng Vite 6 + Vitest 3 (đã có sẵn trong repo) thay vì bản "mới nhất" — Vitest 5 yêu cầu Vite 7; giữ đồng bộ với cấu hình hiện có.
- [P1] Token `uiSurface` và các màu kính mờ là hex 8 chữ số (`#rrggbbaa`); khi đưa vào three.js thì bỏ kênh alpha (`opaqueHex`) — spec yêu cầu hex string, three.js Color không nhận alpha.
- [P1] Token bổ sung ngoài bảng Mục 2 (`bgTop`, `bgHorizon`, `groundLine`, `groundSeeThrough`, `thread`, `sap`, `firefly`, `ui*`...) — cần thiết để không hard-code màu trong component (quy tắc 8).
- [P1] Theme mặc định theo `prefers-color-scheme` và tiếp tục theo OS cho tới khi người dùng tự chọn; lựa chọn tay lưu ở `localStorage['rkt.theme']`.
- [P2] `VITE_USE_MOCK` mặc định là `true` khi không đặt biến (chỉ `false` mới gọi backend thật) — backend chưa có các endpoint `/api/world/*`.
- [P2] Mock world mặc định 30.000 vector; `?vectors=150000` (≥1000, ≤300000) để test hiệu năng — spec nêu cả hai con số.
- [P2] Route depth 2 chọn `nprobe` nhánh con **trong mỗi** cành depth 1 đã chọn (không phải `nprobe` nhánh trên toàn bộ) — để `buildFlightPaths` luôn có nhánh con cho mọi cành đã chọn; Phụ lục A4 viết chưa rõ.
- [P2] Mock: bài top-1 đóng góp 2 chunk (phần Method + Experiments) khi `top_k > 1` để test trường hợp "nhiều chunk cùng một paper".
- [P2] Mock: câu hỏi chứa `/error` sinh event `error` (status 503); `?mockHealth=down` giả lập LLM mất kết nối — phục vụ test giao diện lỗi.
- [P2] Mock: citation "ngoài ngữ cảnh" là `2412.99999` (không tồn tại trong world) — Mục 2 yêu cầu 1 paper_id không có trong grounded.
- [P2] Gốc rễ (`roots.path`) đi qua một điểm trung gian chung theo category (edge bundling đơn giản) và chìm xuống y ≈ −5 trước khi lên (0,0,0) để nhìn thấy được qua mặt đất trong suốt.
- [P3] `send()` khi đang chạy: tin nhắn cũ chuyển trạng thái `stopped`; `stop()` đặt `phase = visualPhase = "error"` với thông điệp "Đã dừng." — spec không nói trạng thái sau khi dừng.
- [P3] Event dữ liệu đến sau `done`/`error` bị bỏ qua (có cảnh báo) — tránh token muộn của câu cũ.
- [P3] Thêm `skipped`/`skipToken` vào `ragStore` để "Bỏ qua animation" áp dụng cho cả các giai đoạn còn lại của câu hỏi.
- [P3] Thêm `uiStore.panelPaperId` (panel bên phải) tách khỏi `focusedPaperId` (camera + ResultCard): giai đoạn `found` focus bài tốt nhất nhưng không tự mở panel.
- [P3] Thêm `fxStore` (overlay trạng thái vector, đánh dấu cành, nhãn route, ô đất nhấp sáng, top-k) — trạng thái hình ảnh tạm thời, chỉ ghi ở ranh giới giai đoạn, không ghi mỗi frame.
- [P4] Câu trả lời trong chat chỉ hiện khi animation tới `generating` (typewriter đuổi kịp dữ liệu đã nhận) — để chat khớp với hình 3D; dữ liệu vẫn nhận đầy đủ ở nền.
- [P4] Dòng chỉ chứa `$$…$$` được chuẩn hoá thành block math vì remark-math v6 coi `$$…$$` trên một dòng là inline.
- [P5] Camera `follow` đọc vị trí quả cầu từ `flightProbe` (biến module, cập nhật mỗi frame) thay vì `cameraTarget` trong store — tránh setState mỗi frame (ràng buộc P9).
- [P5] Khi panel chat/paper mở trên desktop, camera dùng `setViewOffset` để cây nằm giữa vùng còn trống.
- [P5] `?nofx` tắt bloom (dùng cho E2E trên GPU phần mềm); `?perf` bật r3f-perf (chỉ DEV).
- [P6] Màu ô có thùng = màu category × `tileSaturation`; khi lọc, ô không thuộc bộ lọc được pha về màu nền.
- [P7] Nhãn depth 2 hiện khi camera cách nhánh < 70 đơn vị (tối đa 24 nhãn).
- [P7] Hạt nhựa sống đi theo đường: thùng → rễ → thân → một cành → một nhánh con **cùng category** với thùng (nếu có).
- [P8] Ngưỡng raycast Points = khoảng cách camera→target × 0.0065 (kẹp 0.18–1.6); raycast thủ công 30ms/lần thay vì pointer events của r3f.
- [P8] Điểm to/kề camera được giảm alpha theo kích thước pixel để tránh cháy trắng do additive + bloom.
- [P9] Dải số "[0.023, −0.045, …] · 768 chiều" là **minh hoạ** (backend không gửi embedding câu hỏi); mọi điểm số khác (route, compare, grounded) là số thật từ stream.
- [P9] Nhãn HTML neo trong 3D (nhãn cành, điểm route, điểm compare, badge top-k, ResultCard, chữ câu hỏi) dùng một lớp DOM overlay duy nhất + projector trong Canvas, **không dùng drei `<Html>`** — `<Html>` tạo một React root mỗi nhãn và bị race khi unmount với React 19 (`removeChild` error làm dừng animation).
- [P9] Ở giai đoạn `done`: bài được trích dẫn (verified) state 3, bài top-k không được trích dẫn state 2, bài focus giữ state 4.
- [P10] ResultCard không dùng `occlude` (overlay DOM luôn nằm trên canvas); thay vào đó đặt lệch phải điểm sáng 28px và scale theo khoảng cách (`distanceFactor` 16, kẹp 0.45–1.1).
- [P10] Esc theo thứ tự: đóng Cài đặt → đóng panel/focus (camera về mode trước) → bỏ lọc.
- [P11] Proxy dev `/api` trỏ `VITE_BACKEND_URL` (mặc định `http://localhost:8000`, khớp `backend_rag/src/main.ts`) thay vì cổng 3000 trong spec — backend hiện chạy 8000.
- [P11] Dev server giữ cổng 3000 như repo cũ.
- [Trig] `src/utils/rotation.ts` (rotor phức, slerp) được giữ làm thư viện có test nhưng chưa dùng trong scene — thay thử ở QueryFlight (thở) và GroundGrid (nhấp sáng) không cải thiện frame time ≥ 5% và vi phạm ngưỡng lệch 1e-3, nên đã hoàn tác (xem `docs/trig-audit.md`).
- [Trig] Dev hook `globalThis.__rktGl` (chỉ DEV) để đọc `renderer.info` khi đo hiệu năng.
- [Perf] `?bench` bật hook đo (`__rkt`, `__rktGl`, `perfProbe`) cả ở bản build production; không có `?bench` thì probe là no-op.
- [Perf] Chất lượng "Thấp" = bậc 2 (dpr 1 + bloom ¼ độ phân giải) để vẫn giữ phát sáng; chỉ chế độ "Tự động" mới có thể xuống bậc 3 (tắt hậu kỳ, không còn khử răng cưa).
- [Perf] Ngưỡng bloom nâng lên (dark 0.42, light 0.82); không dùng FXAA vì gộp chung pass với bloom gây vệt tím quanh tán (xem `docs/perf-report.md` §7).
- [Perf] Lưới raycast giả định tán cây không có transform (group `canopy` ở gốc toạ độ) — toạ độ trong `vectors.bin` là toạ độ thế giới.
- [P12] Chưa có backend cào: `VITE_USE_MOCK` dùng `MockCrawler` (tick 250 ms, phân bố theo `paper_count` của category, vector mới quanh nhánh cùng category) đi qua **cùng** `streamCrawl` + logic tự kết nối lại như backend thật. Bật/tắt, tốc độ 300/3.000 bài/phút và "Giả lập mất kết nối" nằm trong HUD (chỉ hiện ở chế độ mock).
- [P12] Mục tiêu mock = max(150.000, số bài hiện có + 120.000) để luôn còn bài để cào.
- [P12 → P14.1] Mỗi **vùng** (mỗi category, 10 vùng ở mock) có **một cáp tri thức**; xem các mục [P14.1] bên dưới (thay cho cột hạt thẳng đứng trước đó).
- [P12] Chiều cao thùng tăng theo `crateHeight(paper_count + số bài mới, max ban đầu)` — thùng đã cao tối đa thì giữ 12; bố cục chính xác chờ pipeline dựng lại thế giới (C4).
- [P12] Khi đang cào, mặt đất giảm độ đặc xuống 0.62 (ngoài chế độ "Dưới đất") để thấy các dòng chảy bên dưới; trở lại bình thường khi dừng.
- [P12] Vector mới "mọc" tại thời điểm `born` (đồng hồ `performance.now()/1000`): nếu bật "Hiện hạt lên cây" thì sau 2.6 s (khi hạt đi hết rễ → thân → nhánh), nếu không thì ngay lập tức.
- [P12] "Tự động" dùng pool Thấp (5.000, không có hạt lên rễ) khi bậc chất lượng ≥ 2.
- [P12] Reduce motion: không có hạt; thùng và ô đất vẫn đổi chiều cao/độ sáng.
- [P12] Bỏ tầng nguồn phát sáng (đĩa xoáy ở y = −40) theo yêu cầu: hạt chỉ xuất hiện dần ở đáy cột.
- [P12] Lóe sáng ô/thùng ở light theme yếu hơn (×1.18 / ×1.3) để pastel không cháy trắng.

- [Độ nét] Ưu tiên độ nét hơn vài ms: MSAA 4× trong composer ở bậc đầy đủ, `antialias: true`, **không hạ dpr khi xoay/zoom** (bỏ `AdaptiveDpr`). Bậc tự động: 0 đầy đủ → 1 tắt MSAA → 2 dpr 1.5 + bloom nhẹ → 3 dpr 1, tắt bloom.

- [P14.1] Repo chưa có `FeedCables` (P14) → dựng mới `FeedCables.tsx` từ cột hạt theo vùng của P12. Cáp **luôn hiện** (không chỉ khi cào); khi cào chỉ cáp của vùng nhận bài mạnh lên (hoạt động 0..1 tăng theo `log2(1+count)`, giảm dần ~2.5 s).
- [P14.1] Hình cáp: cubic Bézier từ y = −150, xa ra ngoài theo hướng tâm vùng và nghiêng về phía camera overview (để chạy ra khỏi mép dưới khung hình), uốn vào dưới lưới, 9 đơn vị cuối thẳng đứng cắm vào đáy khối. Mờ dần ở 25% đầu (phía sâu).
- [P14.1] Xung năng lượng do CPU lên lịch (`PulseTrain`, 4 slot/cáp, 1.5–3 s, nhanh gấp ≤4 lần khi vùng đang nhận bài) để biết chính xác lúc xung tới khối → khối "dâng sáng" 0.6 s và ô đất của vùng lóe nhẹ.
- [P14.1] Hạt thành vệt (quad hướng camera dọc theo chuyển động, dài 3–6× bề rộng, rộng tối thiểu 1.5 px); kích thước, tốc độ ±40%; dòng nghỉ 26 vệt/s/cáp (Thấp 8). Hạt lên cây (P12) dùng cùng lớp vệt.
- [P14.1] Khối tri thức: thùng cùng vùng gộp thành MỘT lăng trụ kính (mặt trên theo hình các ô, không vách trong, mép ngoài thụt 0.12 để hai vùng kề nhau không trùng mặt). Độ sâu ∝ sqrt(số bài của vùng) trong [5, 16], thang có dư ×1.6 để vùng lớn nhất vẫn cao thêm khi cào. Lọc theo từng thùng vẫn ở ô đất (click ô).
- [P14.1] Đường lưới mặt đất giảm 40% độ đậm.
- [P14.1, sau góp ý] **Bỏ ống và quầng** (nhìn thô): mỗi vùng chỉ còn một dòng vệt hạt dọc theo đường cáp, rộng bán kính 2.4, vệt rộng 0.6–0.65 (tối thiểu 2.2 px), 40 vệt/s/dòng (Thấp 12). Dark: màu ×1.5, gain ×1.6 (vượt ngưỡng bloom); light: màu đậm hơn (×0.8, gain ×0.75) vì làm sáng pastel sẽ thành trắng lẫn vào nền. Xung năng lượng giờ là một chùm 14 vệt sáng (Thấp 6) chạy sát nhau, tới khối cùng lúc → khối dâng sáng. Reduce motion: không vẽ dòng nào (khối vẫn phản ứng).

- [Giao diện gọn, 2026-10-20] Theo yêu cầu: bỏ giao diện sáng (chỉ còn tối; bảng màu light và nút đổi theme đã xoá, các nhánh `additiveGlow`/light trong code 3D chỉ còn là nhánh không chạy); bỏ ba nút camera Toàn cảnh / Tán cây / Dưới đất (camera mặc định toàn cảnh, kéo/zoom tự do; chế độ "Dưới đất" trong suốt không còn nút bấm); thanh năm chuyển vào Cài đặt (đóng Cài đặt khi đang phát thì dừng phát và hiện lại toàn bộ năm); nhãn chủ đề trên nhánh mặc định tắt, bật trong Cài đặt; bảng cào dữ liệu chuyển vào Cài đặt (vẫn nghe luồng cào từ đầu, chỉ là chỗ hiển thị).
- [Hoạt cảnh tìm kiếm, 2026-10-20] Chậm lại: vector hoá 2.2→2.8 s, bay theo cành 20 đv/s (3.6–6.5 s), so sánh 0.6→0.14 s mỗi điểm (~11 s với mock), "tìm thấy" 1.8→3.2 s; camera bám xa hơn (62→80) và giảm chấn mềm hơn (0.9 s khi bám, 1.15 s khi chuyển cảnh). Khi bay/so sánh, các điểm thường trên tán mờ đi 90% (camera nhìn xuyên 150k điểm sáng bị cháy trắng — vừa chói mắt vừa nặng). Lúc "tìm thấy": camera nhìn kết quả tốt nhất từ ngoài tán (không lao sát vào giữa cành) kèm thẻ kết quả; vào "sinh câu trả lời": camera thu về góc toàn cảnh ban đầu, thẻ đóng (để không che cụm rank, chip trích dẫn mở lại), mọi điểm khác mờ hẳn, các rank #1…#k to và sáng hơn. Thẻ neo 3D giờ tự trượt vào trong màn hình nếu sắp tràn ra ngoài.
- [Thanh năm] Nằm trong Cài đặt; đóng Cài đặt khi đang phát thì dừng phát và hiện lại toàn bộ năm.

## Nối backend RAG_TS thật (2026-10-20)

- [Live] Tách cờ mock: `VITE_USE_MOCK` cho chat / paper / health (RAG_TS ở `VITE_API_BASE=/api/v1`); `VITE_MOCK_WORLD` cho World 3D + luồng cào (pipeline UTH ở `VITE_PIPELINE_BASE=/pipeline`) — theo backend `prompt_backend.md` Phụ lục A1, A9. Cả hai mặc định `true`.
- [Live] Dev server chuyển sang cổng 5174 (5173 là frontend của pipeline) (backend RAG_TS dùng 3000 và mặc định cho phép CORS từ 5174). Proxy: `/api/v1` ➔ `VITE_BACKEND_URL` (:3000), `/pipeline/*` ➔ `VITE_PIPELINE_URL/api/*` (:8000).
- [Live] Health đọc `components.{mongo,qdrant,llm,world}` của `GET /api/v1/health` (Phụ lục A5). Banner chỉ cảnh báo mongo / qdrant / llm; `world` (backend có cây để route) chỉ hiện chấm "Route".
- [Live] Backend thật + world mock: `src/api/worldBridge.ts` đặt paper thật lên vector mock (ổn định trong phiên, đổi `vectorIds[i]` thành id thật) và dựng lại `route` rỗng từ vị trí các paper `compare` (nprobe cành, mỗi cành 1 twig đông vector nhất). Điểm cành/twig = similarity thật của paper tốt nhất đặt ở đó, KHÔNG phải điểm centroid. Tạm thời tới khi pipeline xuất world (Phụ lục B P1); tự tắt khi `VITE_MOCK_WORLD=false` hoặc backend trả route thật.
- [Live] `getPaper` khi chat thật mà world mock: backend trả 404 cho id mock (vector chưa được bridge) ➔ dùng paper mock để tooltip vẫn có tiêu đề.
- [Live] Event `done` có thêm `session_id`, `message_id` (optional) — FE chưa có đăng nhập nên luôn null.
