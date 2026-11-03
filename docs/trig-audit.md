# trig-audit.md — Rà soát lượng giác, góc Euler và phép quay (trig audit)

- **Motivation/Background**: Yêu cầu hạn chế `Math.sin/cos` cho phép quay trong 3D, thay bằng số phức / quaternion khi đo được lợi ích, không đổi hình ảnh.
- **Purpose**: Bảng rà soát mọi chỗ gọi lượng giác, số đo trước/sau và quyết định giữ/đổi cho từng chỗ.
- **Overview Pipeline**: Rà soát code → microbenchmark (`npm run bench`) + frame time 600 frame → giữ/đổi theo ngưỡng (§1–§6, 2026-10-19); chuyển sang rotor theo `FE_DESIGN_SYSTEM.md` §9 (§7, P20, 2026-10-30).
- **Detailed Plan**: §1 Phương pháp; §2 Bảng rà soát; §3 Thử thay thế; §4 Nguồn lag; §5 Kết luận; §6 Tái hiện; §7 Chuyển sang rotor (P20).
- **References**: [`../src/utils/rotation.ts`](../src/utils/rotation.ts), [`../src/utils/trig.bench.ts`](../src/utils/trig.bench.ts), [`../../docs/FE_DESIGN_SYSTEM.md`](../../docs/FE_DESIGN_SYSTEM.md), [`../../docs/FE3d_prompt_v2.md`](../../docs/FE3d_prompt_v2.md).
- **Created**: 2026-10-19T20:49:26+07:00
- **Last Updated**: 2026-10-30T12:10:00+07:00

[STATUS: ACTIVE]

---


Yêu cầu: hạn chế `Math.sin/cos` cho quay và chuyển động trong 3D, thay bằng số phức (2D) / quaternion (3D) nếu **đo được** lợi ích ≥ 5% ở chỗ đó, không thay đổi hình ảnh (sai lệch < 1e-3 đơn vị).

Ngày đo: 2026-10-19 · Máy: Apple M4, Chromium headless (ANGLE Metal), 1440×900, `--disable-gpu-vsync --disable-frame-rate-limit`.

## 1. Phương pháp đo

| Loại | Cách đo | Công cụ |
| :-- | :-- | :-- |
| Chi phí của **đúng đoạn code** (mỗi frame) | Mỗi vòng lặp benchmark = 1 frame mô phỏng (dt = 1/60 s), trung bình hàng triệu frame | `npm run bench` → `src/utils/trig.bench.ts` (vitest bench / tinybench) |
| **Thời gian frame** toàn scene | Trung bình khoảng thời gian `requestAnimationFrame` của 600 frame (bỏ 20 frame khởi động), median của 3–5 lần chạy. Kịch bản giống nhau mọi lần: `?vectors=150000`, gửi câu hỏi → bỏ qua animation → `done` (quả cầu đang "thở", ô đất đang nhấp sáng), camera `overview` | Playwright + `performance.now()` |
| Draw call / số điểm | `renderer.info.render` qua dev hook `globalThis.__rktGl` (chỉ DEV) | three.js |

> `performance.now()` bị làm tròn 5–100 µs trong trình duyệt nên không đo được từng đoạn 50 ns trong frame. Vì vậy chi phí từng đoạn đo bằng microbenchmark, còn ảnh hưởng thực lên frame đo bằng frame time toàn scene.

## 2. Bảng rà soát

Nhóm: **A** = tính một lần lúc dựng scene · **B** = CPU mỗi frame cho một vật · **C** = CPU mỗi frame cho nhiều vật · **D** = trong shader GPU.

### Code của dự án

| Vị trí | Nhóm | Dùng để | Quyết định | Lý do |
| :-- | :-: | :-- | :-: | :-- |
| `src/components/world/fx/QueryFlight.tsx:317` | B | Quả cầu "thở" (dao động scale), 1 `Math.sin`/frame | **Giữ** (đã thử, hoàn tác) | Rotor nhanh hơn 1.35× tại chỗ (43 → 32 ns) nhưng chỉ tiết kiệm 11 ns trên frame ~6.9 ms (0.0002%), frame time không đổi (§3). Bước thời gian cố định 1/120 s làm lệch pha tới 1 bước → scale lệch tới 0.09·ω·Δt = **3.4e-3**, vượt ngân sách 1e-3. Muốn < 1e-3 cần Δt ≤ 1/400 s ⇒ ≥ 7 phép nhân phức/frame, chậm hơn 1 `sin`. |
| `src/components/world/ground/GroundGrid.tsx:135` | C | Độ sáng nhấp nháy của ô đất chứa bài top-k (≤ top_k thùng, thường 2–5) | **Giữ** (đã thử, hoàn tác) | Rotor **chậm hơn**: 1.08× (5 thùng) và 1.31× (20 thùng) cho cả đoạn. Ở 60 fps mỗi frame phải chạy 2 bước cố định, cộng chi phí đọc state; `Math.sin` của V8 vốn đã rẻ (~10 ns). Lệch pha cũng làm độ sáng sai tới 0.029. |
| `src/components/world/materials.ts:15` (`pointScale`, gọi trong `useFrame` của 5 vật liệu điểm) | B | `Math.tan(fov/2)` để đổi kích thước điểm sang pixel | Giữ | Không phải phép quay; 5 phép `tan`/frame (~50 ns). |
| `src/utils/cameraPresets.ts:29, 57–58` | A | Preset camera `overview` (pitch 30°) và `focus` (xoay 35° quanh trục y) | Giữ | Chỉ chạy khi đổi mode / focus, không chạy mỗi frame. Nhánh `follow` (gọi mỗi frame ở `CameraDirector.tsx:48`) **không có lượng giác**. |
| `src/utils/treeGeometry.ts:67–68, 104–106, 141–146` | A | Dựng vòng tiết diện ống (rễ, cành), vỏ cây xù xì, thân thuôn | Giữ | Dựng geometry một lần lúc load. Có thể dùng rotor để sinh vòng tròn, nhưng đây là thời gian load, không phải lag lúc chạy. |
| `src/components/world/fx/Fireflies.tsx:44` | A | Vị trí gốc của đom đóm (toạ độ cực) | Giữ | Một lần lúc mount. |
| `src/api/mock/mockWorld.ts:76, 89, 94–95, 158–159` | A | Bố cục cây và lưới trong world mock | Giữ | Sinh dữ liệu một lần; khi có backend thật thì dữ liệu này do pipeline Python sinh. |
| `src/components/world/canopy/canopyShader.ts:28–29` | D | Nhấp nháy 150k điểm, nhịp đập điểm focus | Giữ | GPU tính `sin` gần như miễn phí (1 lệnh SFU). Frame time không phụ thuộc số điểm khi tắt bloom (§4), nên shader không phải nút thắt. |
| `src/components/world/fx/Fireflies.tsx:21, 23` | D | Đom đóm bay và lập loè | Giữ | Như trên. Chuyển động **đã nằm trong shader** (ví dụ "500 đom đóm CPU" trong đề tương ứng với chỗ này, nhưng ở đây vốn không chạy trên CPU). |
| `src/components/world/fx/QueryText.tsx:23` | D | Hạt chữ xoáy vào quả cầu | Giữ | Như trên; chỉ ~400 hạt trong 2.2 s. |
| `src/components/world/tree/Branches.tsx:112–117` | D | Gân sáng chạy dọc thân/cành, cành được chọn nhấp nháy | Giữ | Như trên. |

**Góc Euler / `rotation.x|y|z`:** không có chỗ nào trong code dự án. Không có vật nào cần hướng: quả cầu là hình cầu, nhãn là DOM overlay, camera do `CameraControls` lo. Vì vậy không có rủi ro gimbal lock và không có chuyển động quay nào cần `slerp`. `slerpQuat` có sẵn trong `rotation.ts` để dùng khi cần (ví dụ thêm vật có hướng).

### Thư viện bên thứ ba (chỉ ghi nhận, không sửa)

| Vị trí | Nhóm | Ghi chú |
| :-- | :-: | :-- |
| `camera-controls` (qua drei `CameraControls`) | B | Dùng `Spherical` (azimuth/polar) + quaternion `_yAxisUpSpace`. Polar bị kẹp (`maxPolarAngle = 0.62π`) nên không chạm cực, không gimbal lock. Đề yêu cầu giữ `CameraControls`. |
| drei `Billboard` (halo quả cầu) | B | Mỗi frame copy quaternion của camera; chỉ đụng Euler khi `lockX/Y/Z` (không dùng). |
| drei `Stars` | A | `setFromSpherical` một lần lúc tạo. |

## 3. Thử thay thế và kết quả đo

Đã cài `src/utils/rotation.ts` (rotor phức, `stepRotation` chuẩn hoá lại mỗi 64 bước, bộ chạy bước thời gian cố định, `slerpQuat`) và **tạm** áp vào hai chỗ B và C ở trên.

**Microbenchmark** (`npm run bench`, mỗi lần lặp = 1 frame):

| Đoạn | `Math.sin` | Rotor phức | Thay đổi |
| :-- | --: | --: | :-- |
| B · quả cầu thở | 43 ns | 32 ns | nhanh hơn 1.35× (−11 ns/frame) |
| C · nhấp sáng 5 thùng (cả đoạn, gồm `setColorAt`) | 113 ns | 122 ns | **chậm hơn** 1.08× |
| C · nhấp sáng 20 thùng (cả đoạn) | 321 ns | 419 ns | **chậm hơn** 1.31× |
| C · 20 thùng (chỉ phần lượng giác) | 337 ns | 406 ns | **chậm hơn** 1.21× |

**Frame time** (600 frame, 150.000 vector, cùng camera):

| Phiên bản | Median | Min – max |
| :-- | --: | :-- |
| Trước (`Math.sin`) | 6.70 ms | 6.40 – 13.12 (5 lần chạy) |
| Sau (rotor cho B + C) | 6.83 ms | 6.71 – 7.07 (5 lần chạy) |
| Trước, đo lại sau khi hoàn tác | 6.89 ms | 6.88 – 6.92 (3 lần chạy) |

Chênh lệch giữa các lần chạy (±0.4 ms ≈ 6%) lớn hơn hàng vạn lần phần tiết kiệm lý thuyết (11 ns). **Không đạt ngưỡng cải thiện 5%, nên đã hoàn tác cả hai chỗ.** Code hiện tại giống hệt trước khi thử; `rotation.ts` và test được giữ lại làm thư viện.

**Bước thời gian thay đổi:** rotor tương ứng với một góc cố định ω·Δt, còn `dt` của trình duyệt dao động. `makeFixedStepper` cộng dồn `dt` và tiêu thụ theo bước Δt cố định, phần dư mang sang frame sau. Cách này độc lập với fps (test: 600 frame @60 fps và 300 frame @30 fps lệch < ω·Δt), nhưng pha luôn trễ tới 1 bước. Đó chính là lý do vi phạm ngưỡng 1e-3 ở trên.

## 4. Nguồn lag thật của scene

| Kịch bản (600 frame, overview) | Frame time (median) |
| :-- | --: |
| 150k vector, đầy đủ hiệu ứng | **6.89 ms** |
| 150k vector, `?nofx` (không bloom/vignette, không MSAA) | **1.62 ms** |
| 30k vector, đầy đủ hiệu ứng | 3.75 ms |
| 30k vector, `?nofx` | 1.63 ms |

| Đếm mỗi frame (150k) | Có bloom | `?nofx` |
| :-- | --: | --: |
| Draw call | 39 | 22 |
| Điểm (points) | ~151.600 | ~151.600 |
| Tam giác | ~138.500 | ~138.500 |

CPU, mỗi lần xảy ra (microbenchmark, 150k vector):

| Việc | Thời gian | Tần suất |
| :-- | --: | :-- |
| Raycast `Points` khi hover | 1.10 ms | mỗi 30 ms khi rê chuột |
| `buildCanopyColors` | 1.36 ms | mỗi lần đổi theme |
| `diffStates` (cập nhật state điểm) | 0.68 ms | mỗi lần đổi bộ lọc / overlay; ~30 lần trong giai đoạn "So sánh" |

## 5. Kết luận

- **Thay lượng giác bằng số phức/quaternion giảm lag 0%.** Đoạn nhiều nhất giảm được là 11 ns/frame (0.0002% của 6.9 ms); ở đoạn có nhiều vật thì rotor còn chậm hơn. Code của dự án không dùng góc Euler nên cũng không có gimbal lock để sửa. Mọi chuyển động nhiều vật (đom đóm, nhựa sống, nhấp nháy lá, hạt câu hỏi, gân cây) **đã chạy trong shader**, đúng với gợi ý "tốt hơn nữa là chuyển sang shader".
- **Nguồn lag lớn nhất là hậu kỳ bloom:** ~5.3 ms trên 6.9 ms (**~77% frame**). Pipeline bloom mipmap cùng render target MSAA 4× làm số draw call tăng từ 22 lên 39.
- **Nguồn thứ hai là fill-rate của sprite điểm** khi vẽ vào target HDR MSAA đó: 150k so với 30k vector tốn thêm ~3.1 ms khi có bloom, nhưng **0 ms** khi tắt bloom. Vậy chi phí nằm ở overdraw của sprite cộng dồn (additive), không phải ở số điểm, số draw call hay phép tính lượng giác.
- **CPU chỉ đột biến theo sự kiện:** raycast khi hover (1.1 ms mỗi 30 ms) và `diffStates` (0.68 ms × ~30 lần trong giai đoạn so sánh), không phải chi phí mỗi frame.
- **Hướng tối ưu có tác dụng thật (chưa làm trong phạm vi bài này):**
  1. Giảm `multisampling` của `EffectComposer` (4 → 0, dùng SMAA) hoặc hạ `resolutionScale` của bloom.
  2. Kẹp nhỏ kích thước sprite / giảm overdraw ở mode overview.
  3. Dùng BVH/octree cho raycast điểm.
  4. Cho `diffStates` chỉ duyệt các index thay đổi thay vì cả 150k.

  Mỗi hướng cần đo trước/sau như trên.

## 6. Tái hiện

```bash
npm run bench                                   # microbenchmark §3 + §4 (CPU)
npm test -- src/utils/rotation.test.ts          # 7 test rotor / slerp
npm run dev -- --port 5199                       # rồi chạy script đo frame time bằng Playwright (mô tả ở §1)
```

## 7. Chuyển sang rotor (P20, 2026-10-30)

Theo [`FE_DESIGN_SYSTEM.md`](../../docs/FE_DESIGN_SYSTEM.md) §9: phép quay viết bằng rotor; `sin/cos` chỉ còn trong `makeRotor` và các ngoại lệ đã đo ở §3 (gắn `// trig-ok:`). `npm run lint` chặn mọi `Math.sin/cos/atan2` không có chú thích (`check-design`, rule `trig-in-frame`, `trig-any`).

### 7.1 Chỗ đã đổi

| Vị trí | Trước | Sau |
| :-- | :-- | :-- |
| `utils/treeGeometry.ts` `tubeAlongPath` | `sin/cos` cho mỗi đỉnh của mỗi hàng | `ringRotors(radial)` một lần, dùng lại cho mọi hàng |
| `utils/treeGeometry.ts` `buildTrunkGeometry` | `cos/sin(a + twist)` mỗi đỉnh | vòng `ringRotors` × `makeRotor(twist)` mỗi hàng (`mulRotor`) |
| `utils/cameraPresets.ts` | `cos/sin` của 30° và 35° mỗi lần gọi; ma trận quay viết tay | rotor hằng `OVERVIEW_PITCH`, `FOCUS_SWING` + `rotateComplex` |
| `utils/feedCables.ts` | `cos/sin(k · 2.39996)` | `powRotor(GOLDEN, k)` |
| `components/world/fx/FeedCables.tsx` (runtime) | `sqrt(u)·(cos, sin)` mỗi hạt | `randomInDisk(rng, DISK)` — loại bỏ, không trig, không cấp phát |
| `components/world/fx/Fireflies.tsx` | `cos/sin` góc ngẫu nhiên | `randomDirection(rng)` |
| `api/mock/mockWorld.ts` | `atan2` → `cos/sin`, góc → `cos/sin` | hướng nhánh là rotor (chuẩn hoá vị trí), `makeRotor` + `mulRotor` |

Giữ (`// trig-ok:`): `QueryFlight.tsx` (thở), `GroundGrid.tsx` (nhấp sáng) — dao động vô hướng, §3; `treeGeometry.ts` `bark()` và `flare` — sóng làm nhiễu, không phải phép quay. `materials.ts` `Math.tan(fov/2)` không thuộc rule.

### 7.2 Microbenchmark (`npx vitest bench --run src/utils/trig.bench.ts`, Apple M4)

| Case | Trước → Sau |
| :-- | :-- |
| A · cả tiết diện ống, 25 hàng × 7 điểm (rễ, nhánh) | rotor **nhanh hơn 2.96×** |
| A · cả tiết diện ống, 25 hàng × 11 điểm (cành) | rotor **nhanh hơn 2.96×** |
| A · thân cây 50 hàng × 41 điểm | rotor **nhanh hơn 1.57×** |
| A · một vòng 16 / 32 / 64 điểm (riêng `ringRotors`) | 1.10× chậm hơn / 1.71× / 2.06× nhanh hơn — vòng đơn lẻ 16 điểm chậm hơn vì cấp phát `Float64Array`, nhưng mỗi ống dùng lại một vòng cho mọi hàng nên tính cả ống vẫn nhanh hơn |
| B/C · 1000 mẫu trong đĩa (`FeedCables`, runtime) | `randomInDisk` **nhanh hơn 1.65×** |

### 7.3 Độ chính xác (so số liệu trước/sau, code cũ làm oracle)

| Đầu ra | Số giá trị | max \|Δ\| |
| :-- | --: | --: |
| `tubeAlongPath` vị trí / pháp tuyến | 819 / 819 | 6.4e-16 / 6.4e-16 |
| `buildTrunkGeometry` vị trí | 6 150 | 1.1e-15 |
| Preset camera (overview, canopy, ground, 2 focus) | 30 | 0 |
| Mock world: vị trí cây / ô đất / vector | 633 / 339 / 24 000 | 1.4e-14 / 0 / 0 |
| `cablePath` | 1 440 | 0 |

Ngưỡng của spec là 1e-3. Test cố định: `rotation.test.ts` (`ringRotors`, `powRotor` so với `cos/sin`; `randomInDisk`, `randomDirection` kiểm thống kê 100 000 / 50 000 mẫu).

### 7.4 Frame time và ảnh 3D

- **Frame time** (`test:perf`, 150k, dev, headless, server mock `127.0.0.1:5197` chạy **lần lượt**, xen kẽ P19 ↔ P20): P19 median 2.2 / 2.1 / 2.1 ms, P20 median 2.1 / 2.2 / 2.2 ms; p95 3.4 ms; 4 long task cả hai.
- **Ảnh canvas** (`?vectors=8000&nofx`, reduce motion): P19 so với chính nó lệch 0.06 % (nhiễu); P20 so với P19 lệch 0.18 % (ngưỡng 0.5 %). Phần lệch là các điểm đom đóm/hạt cáp (chuỗi số ngẫu nhiên đổi vì lấy mẫu loại bỏ, phân bố giữ nguyên) và số FPS của PerfHUD; không có đường nào của thân/cành.

