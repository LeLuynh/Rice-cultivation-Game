# Nguồn tài nguyên

Giai đoạn 1 chưa dùng model 3D, ảnh hay âm thanh bên ngoài. Toàn bộ cảnh (ruộng, nhà, dừa, tre, người, công cụ) được dựng bằng khối hình học trong code.

Khi thêm model (ví dụ Kenney, Quaternius – giấy phép CC0), ghi tên gói, tác giả, giấy phép và đường dẫn tại đây.

- Đồ họa: Babylon.js (Apache-2.0) — `@babylonjs/core`, `@babylonjs/materials` (SkyMaterial, WaterMaterial, CustomMaterial), `@babylonjs/procedural-textures` (gạch, gỗ). Mọi texture khác (cỏ, bùn, ngói, rơm, lá dừa, biển "BÁN") vẽ bằng canvas trong `packages/client/src/scene/textures.ts`; không dùng tài nguyên tải ngoài.
