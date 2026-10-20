# Báo Cáo So Sánh Hiệu Năng 3D + Chat Stream (run)

- **Thời gian đo**: 2026-10-20T13:59:48.467Z
- **URL**: `http://localhost:5174/?vectors=150000&bench`
- **SLA Mục tiêu**: 60 FPS (Median $\le 16.6\text{ms}$, p99 $\le 33.3\text{ms}$, 0 Long Tasks $> 50\text{ms}$)
- **Kết quả đánh giá**: **❌ CHƯA ĐẠT (Có Lag Spike)**

## 1. Bảng số liệu chi tiết

| Chỉ số | Kết quả đo được | Ngưỡng SLA 60 FPS | Trạng thái |
| :--- | :--- | :--- | :---: |
| **Frame Time Median** | **0.8 ms** (~1250 FPS) | $\le 16.6\text{ ms}$ | ✅ |
| **Frame Time p95** | **102 ms** | $\le 25.0\text{ ms}$ | ❌ |
| **Frame Time p99** | **107.1 ms** | $\le 33.3\text{ ms}$ | ❌ |
| **Max Frame Time** | **108.4 ms** (~9.2 FPS) | $\le 40.0\text{ ms}$ | ❌ |
| **Long Tasks (>50ms)** | **23 tasks** (Max: 8549 ms) | **0 tasks** | ❌ |
| **Tổng số frame ghi nhận** | **187 frames** | - | - |

## 2. Danh sách Long Tasks (nếu có)
- Task #1: **70.0 ms** tại thời điểm 3845.6 ms
- Task #2: **75.0 ms** tại thời điểm 3916.3 ms
- Task #3: **62.0 ms** tại thời điểm 4007.5 ms
- Task #4: **74.0 ms** tại thời điểm 4071.8 ms
- Task #5: **8549.0 ms** tại thời điểm 4165.9 ms
- Task #6: **97.0 ms** tại thời điểm 12716.1 ms
- Task #7: **103.0 ms** tại thời điểm 13061.6 ms
- Task #8: **106.0 ms** tại thời điểm 13164.8 ms
- Task #9: **104.0 ms** tại thời điểm 13271.9 ms
- Task #10: **104.0 ms** tại thời điểm 13376.4 ms
- Task #11: **103.0 ms** tại thời điểm 13480.9 ms
- Task #12: **101.0 ms** tại thời điểm 13584.0 ms
- Task #13: **101.0 ms** tại thời điểm 13685.7 ms
- Task #14: **101.0 ms** tại thời điểm 13786.8 ms
- Task #15: **100.0 ms** tại thời điểm 13888.7 ms
