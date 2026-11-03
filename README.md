# CHUAOL — Chùa Online

Không gian chùa Việt 3D chạy trên trình duyệt (máy tính và điện thoại), xây bằng **Three.js**: dạo bước qua Tam quan, thắp hương, thỉnh chuông, gõ mõ niệm Phật, ngồi thiền dưới gốc bồ đề, thả đèn hoa đăng và cùng đi lễ với những người khác.

**Trạng thái:** bản chơi thử 0.1, chạy offline (chưa có máy chủ). Người khác trong chùa là khách mô phỏng.

- 🎮 Chơi thử trên trình duyệt: https://claude.ai/artifact/SHmY38KWodqxaFq4h7KPo6 (trang riêng tư; chủ dự án cần chia sẻ thì người khác mới mở được)
- 📜 Kế hoạch phát triển: [`docs/KE_HOACH.md`](docs/KE_HOACH.md)
- 🧭 Quyết định kỹ thuật và số đo tech spike: [`docs/ADR/0001-rendering-stack.md`](docs/ADR/0001-rendering-stack.md)

## Chạy bản chơi thử

Cần Node.js 22 và pnpm 10.

```bash
pnpm install
pnpm dev          # mở http://localhost:5173
```

Các lệnh khác:

```bash
pnpm typecheck    # kiểm tra kiểu TypeScript
pnpm test         # unit test (âm lịch, bố cục, đường đi, va chạm)
pnpm build        # bản build tĩnh trong apps/client/dist, đặt được ở bất kỳ thư mục con nào
pnpm e2e          # smoke test end-to-end bằng Playwright (chạy sau pnpm build)
```

Tham số URL khi phát triển: `?bots=50&quality=low&time=night&perf=1&debug=1`.

## Điều khiển

| | Máy tính | Điện thoại |
|---|---|---|
| Đi lại | `W` `A` `S` `D` hoặc phím mũi tên, giữ `Shift` để đi nhanh | Kéo vòng tròn bên trái |
| Nhìn quanh | Kéo chuột, cuộn để thu phóng | Vuốt màn hình, chụm hai ngón |
| Tương tác | `E` | Chạm nút gợi ý |
| Rời hoạt động | `Esc` | Nút "Rời đi" |
| Chắp tay / cúi chào | `1` / `2` | Nút ở góc phải |
| Gõ mõ | Phím cách | Nút "Gõ mõ" |

## Trong bản chơi thử có gì

- Chùa nguyên bản kiểu Bắc Bộ dựng hoàn toàn bằng code: Tam quan chồng diêm, sân gạch, lư hương, gác chuông, hai dãy hành lang, Chính điện có tượng Phật, vườn tháp, rừng tre, hồ sen.
- Sáu hoạt động: thắp hương (kèm lời nguyện riêng tư), thỉnh chuông (kèm kệ nghe chuông), gõ mõ niệm Phật, lễ Phật ba lạy, ngồi thiền có vòng thở, thả đèn hoa đăng.
- Ngày âm lịch và các ngày rằm, mùng 1, lễ lớn; ngày đêm theo giờ Việt Nam (đổi được trong Cài đặt).
- 0–80 khách mô phỏng tự đi lễ, chào hỏi bằng câu mẫu, nhường chỗ cho người chơi.
- Nhật ký tu tập riêng tư lưu trên máy, không xếp hạng.
- Âm thanh tổng hợp bằng Web Audio: chuông đại hồng chung, mõ, chuông gia trì, gió, chim, dế, nước.
- Ba mức chất lượng cùng chế độ tự động hạ/nâng theo FPS, kèm bảng thông số hiệu năng.

## Cấu trúc

```
apps/client/            Bản chơi thử (Vite + React + React Three Fiber)
  src/game/layout.ts    Bố cục chùa: toạ độ, va chạm, điểm tương tác, đường đi
  src/game/world/       Dựng kiến trúc, mái chùa, tượng, texture, vật liệu
  src/game/actors/      Tư thế người (IK), khách mô phỏng
  src/game/render/      Component R3F: đám đông, hương khói, hồ sen, chuông, bầu trời
  src/game/audio/       Âm thanh tổng hợp
  src/ui/               Giao diện
  e2e/smoke.mjs         Smoke test Playwright
docs/                   Kế hoạch, ADR
```

## Nguyên tắc

Tôn kính · Thanh tịnh · Không thương mại hóa tâm linh. Hình ảnh, âm thanh và nội dung nghi lễ trong bản chơi thử là tạm thời và chưa qua cố vấn Phật giáo duyệt.
