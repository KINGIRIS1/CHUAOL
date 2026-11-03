# ADR 0001 — Nền tảng render và cách dựng bản chơi thử

- Trạng thái: Đã chấp nhận
- Ngày: 03/11/2026
- Liên quan: [Kế hoạch](../KE_HOACH.md), mục 4 và mục 13 (tech spike)

## Bối cảnh

Kế hoạch yêu cầu một tech spike trước khi làm vertical slice: dựng thử ngôi chùa và khoảng 30 người cùng lúc, đo xem Three.js trên trình duyệt có giữ được ngân sách hiệu năng ở mục 4.8 hay không. Đội cũng đã chốt các khuyến nghị ở mục 12: chùa nguyên bản lấy cảm hứng chùa Bắc Bộ, góc nhìn thứ ba, giao tiếp bằng câu mẫu, chưa làm app native.

Bản chơi thử phải chạy được ngay mà chưa có máy chủ, chưa có họa sĩ 3D và chưa có bản thu âm.

## Quyết định

1. **Three.js qua React Three Fiber**, TypeScript, Vite. React dùng luôn cho giao diện. Dùng WebGL2 (`WebGLRenderer`), chưa dùng WebGPU.
2. **Chưa dùng drei và Rapier.** Bầu trời, sao, mặt nước, khói, chỉnh chất lượng tự động đều viết trực tiếp bằng Three.js (gói `three/examples`). Mặt bằng chùa phẳng nên va chạm dùng hình tròn/hộp/elip 2D tự viết (`src/game/collision.ts`), bậc thềm và nền cao tính bằng hàm `heightAt`. Khi có địa hình dốc, cầu thang phức tạp hoặc vật thể vật lý thì xem lại Rapier.
3. **Mọi người trong chùa vẽ bằng instancing.** Mỗi bộ phận (áo, thân, đầu, tóc, tay, bàn tay, bóng chân) là một `InstancedMesh`, nên dù 1 hay 80 người cũng chỉ tốn 7 draw call. Tư thế (chắp tay, cúi chào, quỳ, lạy, ngồi thiền, gõ mõ) là các tham số trộn; tay dùng IK hai đốt (`src/game/actors/avatarRig.ts`).
4. **Kiến trúc tĩnh gộp theo vật liệu.** Toàn bộ công trình được dựng bằng code rồi gộp lại, mỗi vật liệu một mesh (`src/game/world/builder.ts`). Che tối giả (fake AO) bằng màu đỉnh: chân tường và lòng Chính điện tối hơn, đỡ phải bật bóng đổ ở máy yếu.
5. **Tài nguyên tạm:** texture vẽ bằng canvas (ngói mũi hài, gạch, cỏ, đá, cờ Phật giáo, hoành phi), âm thanh tổng hợp bằng Web Audio (chuông đại hồng chung với các partial lệch hài, mõ, chuông gia trì, gió, chim, dế, nước). Sẽ thay bằng mô hình Blender và bản thu âm thật theo pipeline ở mục 4.7.
6. **Tone mapping Neutral** (Khronos PBR Neutral) để giữ đúng màu ngói, gạch, sơn son; ACES làm màu bị bạc và ngả hồng.
7. **Chất lượng ba mức** (Thấp/Trung bình/Cao) cộng chế độ Tự động: khi FPS dưới 26 trong 3 giây thì giảm độ phân giải, rồi hạ mức; khi FPS ổn định trên 56 thì nâng độ phân giải trở lại.

## Kết quả đo

Đo trong Chromium headless render bằng CPU (SwiftShader), 30 khách mô phỏng, khung 1024×620. FPS trong môi trường này không đại diện cho máy thật nên chỉ ghi số draw call, số tam giác và dung lượng (không phụ thuộc phần cứng).

| Chỉ số | Thấp | Trung bình | Ngân sách mobile (mục 4.8) |
|---|---|---|---|
| Draw call mỗi khung hình | 41–59 | 67–74 (gồm lượt vẽ bóng) | ≤ 150 |
| Tam giác mỗi khung hình | 103–128 nghìn | 204–210 nghìn (gồm lượt vẽ bóng) | ≤ 300 nghìn |
| JavaScript (gzip) | 360 KB | | |
| Tổng tải lần đầu (JS + CSS + font woff2) | 1,42 MB, khoảng 0,52 MB khi truyền nén | | ≤ 15 MB |

**Chưa đo:** FPS trên điện thoại Android tầm trung và iPhone cũ. Cách đo: mở bản chơi thử trên máy, vào Cài đặt, bật "Hiện thông số hiệu năng", đứng ở sân chùa với 30 rồi 50 khách mô phỏng và ghi lại FPS. Tiêu chí đạt của GĐ0 vẫn là ≥ 30 FPS trên máy Android chuẩn.

## Hệ quả

- Thêm người không làm tăng draw call; chi phí chủ yếu nằm ở CPU (tính ma trận khoảng 10 bộ phận mỗi người mỗi khung hình) và ở số đỉnh. 80 người vẫn nằm trong ngân sách tam giác.
- Va chạm 2D đủ cho bản chơi thử nhưng không xử lý được dốc hay cầu nhiều tầng.
- Hình khối dựng bằng code chỉ là tạm. Bố cục trong `src/game/layout.ts` là nguồn dữ liệu duy nhất cho va chạm, điểm tương tác và đường đi của khách, nên khi thay bằng mô hình Blender thì chỉ cần giữ đúng toạ độ.
- Khách mô phỏng (`src/game/actors/bots.ts`) dùng chung cơ chế giữ chỗ (slot) với người chơi. Khi có multiplayer, phần này được thay bằng trạng thái phòng Colyseus, còn cách vẽ và tư thế giữ nguyên.
