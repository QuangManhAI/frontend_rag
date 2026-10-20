# Báo Cáo Hiệu Năng 3D + Chat Stream (active_frames)

- **Thời gian đo**: 2026-10-20T13:03:06.736Z
- **URL**: `http://localhost:5174/?vectors=150000&bench`
- **SLA Mục tiêu**: 60 FPS (Median $\le 16.6\text{ms}$, p99 $\le 33.3\text{ms}$, 0 Long Tasks $> 50\text{ms}$)
- **Kết quả đánh giá**: **❌ CHƯA ĐẠT (Có Lag Spike)**

## 1. Bảng số liệu chi tiết

| Chỉ số | Kết quả đo được | Ngưỡng SLA 60 FPS | Trạng thái |
| :--- | :--- | :--- | :---: |
| **Frame Time Median** | **1 ms** (~1000 FPS) | $\le 16.6\text{ ms}$ | ✅ |
| **Frame Time p95** | **116.2 ms** | $\le 25.0\text{ ms}$ | ❌ |
| **Frame Time p99** | **150.7 ms** | $\le 33.3\text{ ms}$ | ❌ |
| **Max Frame Time** | **155.4 ms** (~6.4 FPS) | $\le 40.0\text{ ms}$ | ❌ |
| **Long Tasks (>50ms)** | **20 tasks** (Max: 9544 ms) | **0 tasks** | ❌ |
| **Tổng số frame ghi nhận** | **183 frames** | - | - |

## 2. Danh sách Long Tasks (nếu có)
- Task #1: **78.0 ms** tại thời điểm 3877.8 ms
- Task #2: **77.0 ms** tại thời điểm 3956.7 ms
- Task #3: **61.0 ms** tại thời điểm 4051.7 ms
- Task #4: **67.0 ms** tại thời điểm 4114.2 ms
- Task #5: **9544.0 ms** tại thời điểm 4202.0 ms
- Task #6: **125.0 ms** tại thời điểm 13746.8 ms
- Task #7: **123.0 ms** tại thời điểm 14061.2 ms
- Task #8: **155.0 ms** tại thời điểm 14184.3 ms
- Task #9: **143.0 ms** tại thời điểm 14340.0 ms
- Task #10: **128.0 ms** tại thời điểm 14484.5 ms
- Task #11: **134.0 ms** tại thời điểm 14613.6 ms
- Task #12: **122.0 ms** tại thời điểm 14748.1 ms
- Task #13: **114.0 ms** tại thời điểm 14870.8 ms
- Task #14: **112.0 ms** tại thời điểm 14985.5 ms
- Task #15: **107.0 ms** tại thời điểm 15098.2 ms
- Task #16: **108.0 ms** tại thời điểm 15206.0 ms
- Task #17: **113.0 ms** tại thời điểm 15314.7 ms
- Task #18: **150.0 ms** tại thời điểm 15428.3 ms
- Task #19: **123.0 ms** tại thời điểm 15579.2 ms
- Task #20: **119.0 ms** tại thời điểm 15702.9 ms
