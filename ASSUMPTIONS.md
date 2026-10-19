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
