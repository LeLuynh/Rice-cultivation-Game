# Làng Lúa

Game trồng lúa góc nhìn thứ nhất chạy trên trình duyệt: làm thuê cho Địa chủ, mua đất tự canh tác, rồi lên làm Địa chủ thuê NPC. Bối cảnh làng quê Việt Nam, đồ họa low-poly.

**Chơi:** sau khi bật GitHub Pages (xem dưới), link có dạng `https://<tên-tài-khoản>.github.io/Rice-cultivation-Game/`.

Giai đoạn 1: một người chơi, lưu tiến trình trong trình duyệt (localStorage), chỉ hỗ trợ máy tính có bàn phím và chuột.

## Chạy trên máy

Cần Node.js 20 trở lên.

```bash
npm install
npm run dev      # mở http://localhost:5173
npm test         # kiểm thử luật chơi và giao diện
npm run build    # bản đóng gói ở packages/client/dist
```

## Cấu trúc

- `packages/core` – toàn bộ luật chơi (TypeScript thuần, không phụ thuộc trình duyệt). Mọi con số nằm ở `packages/core/src/config.ts`.
- `packages/client` – Vite + React + Babylon.js 9: cảnh 3D (trời theo giờ, nước phản chiếu, lúa có gió, bóng đổ), HUD, các bảng, lưu/tải. Thêm `?debug` vào URL để mở store cho công cụ chụp màn hình.
- `docs/superpowers/specs` – bản thiết kế; `docs/superpowers/plans` – kế hoạch triển khai.

## Đăng lên GitHub Pages

Mỗi lần push lên nhánh `main`, GitHub Actions (`.github/workflows/deploy.yml`) chạy test, build và đăng bản mới. Lần đầu cần vào **Settings → Pages → Source** và chọn **GitHub Actions**.
