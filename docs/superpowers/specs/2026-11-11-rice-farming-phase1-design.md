# Thiết kế Giai đoạn 1 – Game trồng lúa góc nhìn thứ nhất

Ngày: 2026-11-11 · Trạng thái: chờ duyệt

## 1. Mục tiêu

- **Mục tiêu dài hạn:** phát hành thật, nhiều người chơi trực tuyến cùng một làng.
- **Giai đoạn 1:** một người chơi, mở link trên trình duyệt máy tính là chơi, chưa có server. Địa chủ là NPC.
- **Tiêu chí thành công Giai đoạn 1:**
  1. Chơi trọn lộ trình: làm thuê → mua đất → tự canh tác → lên Địa chủ thuê NPC.
  2. Luật chơi nằm trọn trong gói `core`, chạy được trên server ở Giai đoạn 2 mà không phải viết lại.
  3. Mọi con số nằm ở một file cấu hình duy nhất và hiển thị đúng trong màn hình hướng dẫn.
  4. Có link công khai trên GitHub Pages, chạy khoảng 60 khung hình/giây trên laptop tầm trung.

### Lộ trình các giai đoạn

| Giai đoạn | Nội dung |
|---|---|
| 1 (tài liệu này) | Một người chơi, trình duyệt, lưu localStorage |
| 2 | Server Colyseus dùng lại `core`, nhiều người chơi một làng, tài khoản, database |
| 3 | Kinh tế giữa người chơi: Địa chủ là người chơi, thuê người chơi khác, giá động |
| 4 | Thời tiết, âm thanh (kèm chỉnh âm lượng), đa ngôn ngữ, điện thoại |

## 2. Công nghệ

- **Ngôn ngữ:** TypeScript.
- **Quản lý gói:** npm workspaces. Cần Node.js 20 trở lên.
- **Client:** Vite, React, react-three-fiber, @react-three/drei, Zustand.
- **Kiểm thử:** Vitest.
- **Đồ họa:** low-poly. Model CC0 từ Kenney và Quaternius; vật dụng đặc trưng Việt Nam (nón lá, liềm, gáo, bó mạ) dựng bằng khối hình học trong code.
- **Triển khai:** GitHub Actions build và đăng lên GitHub Pages mỗi khi push lên `main`.

## 3. Cấu trúc dự án

```
Rice-cultivation-Game/
├─ package.json            npm workspaces
├─ packages/
│  ├─ core/                LUẬT CHƠI – TypeScript thuần
│  │  └─ src/
│  │     ├─ config.ts      mọi con số (mục 5)
│  │     ├─ state.ts       kiểu dữ liệu trạng thái + tạo game mới
│  │     ├─ actions.ts     kiểu dữ liệu các hành động
│  │     ├─ reducer.ts     applyAction()
│  │     ├─ tick.ts        tick()
│  │     ├─ rng.ts         bộ sinh số ngẫu nhiên có seed
│  │     └─ *.test.ts
│  ├─ client/              TRÌNH DUYỆT
│  │  └─ src/
│  │     ├─ scene/         cảnh 3D, ô ruộng, nhà, cây, NPC, tay cầm công cụ
│  │     ├─ ui/            HUD và các bảng
│  │     └─ game/          store Zustand, vòng tick, lưu/tải, cầu nối core
│  └─ server/              (Giai đoạn 2 – chưa tạo)
└─ docs/
   └─ CREDITS.md           nguồn model
```

**Quy tắc ranh giới:**
- `core` không import bất cứ thứ gì từ `client`, không dùng DOM, `window`, `Date.now()` hay `Math.random()`. Thời gian đi vào qua `tick()`, ngẫu nhiên lấy từ `rng.ts` với seed lưu trong trạng thái. Nhờ vậy kết quả tái lập được trong kiểm thử và trên server.
- `client` chỉ đọc trạng thái và gửi hành động. Không tự sửa trạng thái game.

### Giao diện của `core`

```ts
createNewGame(playerName: string, seed: number): GameState
applyAction(state: GameState, action: Action): ActionResult
  // ActionResult = { ok: true, state, events } | { ok: false, error: ErrorCode }
tick(state: GameState, dtSeconds: number): { state, events }
```

- `events` là danh sách sự kiện để client hiện thông báo, ví dụ `{ type: 'wagePaid', plotId: 3, amount: 20 }`.
- Kiểm tra khoảng cách người chơi tới ô ở Giai đoạn 1 do client làm. Sang Giai đoạn 2 server kiểm tra.

## 4. Luật chơi

### 4.1 Bản đồ và quyền sở hữu
- 20 ô, xếp lưới 4 × 5, đánh số 1–20.
- **Ô 1–12:** ruộng Địa chủ NPC, không bao giờ bán. Đây là nơi người chơi làm thuê.
- **Ô 13–20:** Địa chủ rao bán. Ô chưa bán để ở trạng thái Đất khô, không có việc.
- Người chơi bắt đầu với **50 Xu**, kho trống, mọi công cụ ở cấp 1.
- Lúc tạo game, 12 ô của Địa chủ được rải ngẫu nhiên ở các giai đoạn khác nhau để có việc ngay từ đầu.

### 4.2 Vòng đời một ô

| # | Giai đoạn | Để sang giai đoạn tiếp | Thời gian |
|---|---|---|---|
| 1 | Đất khô | hành động **Cày bừa** | — |
| 2 | Đất đã làm | hành động **Gieo mạ** (tốn 1 giống) | — |
| 3 | Mạ non | tự lớn | 180 giây |
| 4 | Mạ đủ lớn | hành động **Nhổ mạ và cấy** | — |
| 5 | Lúa non | tự lớn | 300 giây |
| 6 | Lúa xanh | tự lớn | 300 giây |
| 7 | Trổ bông | tự lớn | 240 giây |
| 8 | Chín vàng | hành động **Gặt** | — |
| 9 | Bó lúa | hành động **Tuốt và phơi** → ra lúa (kg), ô về Đất khô | — |

- Khi về Đất khô, các chỉ số của vụ (sức khỏe, nước, cờ bón phân và tháo nước, cỏ, sâu, số kg bị mất) được đặt lại.
- Ruộng Địa chủ quay về Đất khô thì bắt đầu vụ mới luôn.

### 4.3 Chăm sóc và năng suất
- **Sức khỏe** từ 0 đến 100, đầu vụ bằng 100.
- **Năng suất** khi tuốt = `max(40, round(40 + 60 × sức khỏe / 100) − số kg bị mất)` kg.
- **Nước:** từ 0–100%. Bằng 100 khi vào Mạ non. Ở các giai đoạn Mạ non, Mạ đủ lớn, Lúa non, Lúa xanh, nước giảm 5 sau mỗi 10 giây. Hành động **Tưới** đưa nước về 100.
- Trừ sức khỏe:

| Vấn đề | Điều kiện | Bị trừ |
|---|---|---|
| Thiếu nước | Đang ở giai đoạn giảm nước và nước dưới 30 | −2 sức khỏe mỗi 10 giây |
| Cỏ | Lúa non hoặc Lúa xanh, chưa có cỏ: mỗi 60 giây 30% khả năng mọc. Hết bằng **Làm cỏ** | −1 mỗi 10 giây khi có cỏ |
| Sâu | Lúa xanh hoặc Trổ bông, chưa có sâu: mỗi 60 giây 25% khả năng. Hết bằng **Bắt sâu** | −2 mỗi 10 giây khi có sâu |
| Không bón phân | Rời Lúa xanh mà chưa **Bón phân** (làm được ở Lúa non hoặc Lúa xanh, tối đa một lần, tốn 1 phân) | −15 một lần |
| Không tháo nước | Vào Chín vàng mà chưa **Tháo nước** (làm được ở Trổ bông, đưa nước về 0) | −10 một lần |
| Chín quá lâu | Ở Chín vàng hơn 180 giây | thêm 2 kg vào số kg bị mất sau mỗi 10 giây |

### 4.4 Thao tác và công cụ
- Người chơi nhìn vào ô, cầm đúng công cụ rồi giữ chuột trái cho tới khi thanh tiến trình đầy. Nhả ra giữa chừng thì hủy, không mất gì.
- Một ô chỉ có một việc đang làm tại một thời điểm.
- Thời gian thao tác thực tế = thời gian gốc × hệ số cấp: cấp 1 ×1,0 · cấp 2 ×0,7 · cấp 3 ×0,4.

| Phím | Công cụ | Hành động (thời gian gốc) |
|---|---|---|
| 1 | Cuốc (cấp 2: trâu cày, cấp 3: máy cày) | Cày bừa (6 giây) |
| 2 | Rổ mạ | Gieo mạ (4 giây), Nhổ mạ và cấy (6 giây) |
| 3 | Gáo nước | Tưới (2 giây), Tháo nước (2 giây) |
| 4 | Bao phân | Bón phân (3 giây) |
| 5 | Liềm | Gặt (6 giây), Làm cỏ (3 giây) |
| 6 | Tay không | Bắt sâu (3 giây), Tuốt và phơi (5 giây) |

- Thời gian thao tác do client đo. `core` chỉ nhận hành động khi đã hoàn thành.

### 4.5 Làm thuê (ô 1–12)
- Một ô Địa chủ có **việc** khi đang cần một trong các hành động: Cày bừa, Gieo mạ, Nhổ mạ và cấy, Tưới (khi nước dưới 30), Bón phân (khi ở Lúa xanh mà chưa bón), Làm cỏ, Bắt sâu, Tháo nước (khi ở Trổ bông mà chưa tháo), Gặt, Tuốt và phơi.
- Người chơi làm xong việc thì nhận công ngay theo bảng ở mục 5.2. Giống và phân trên ruộng Địa chủ do Địa chủ trả.
- Việc nào để quá **60 giây** thì người làm của Địa chủ tự làm, người chơi không được công.
- Lúa thu hoạch trên ruộng Địa chủ thuộc về Địa chủ.

### 4.6 Tự làm chủ (ô 13–20)
- Mua ở nhà Địa chủ: đất 2.000 Xu/ô, giống 30 Xu/bao, phân 40 Xu/bao. Mỗi bao dùng cho 1 ô một vụ.
- Người chơi tự làm mọi việc trên ô của mình, không có công.
- Tuốt và phơi xong, lúa vào kho. Bán cho Địa chủ 8 Xu/kg, **không thu thuế**. Bán được một phần hoặc toàn bộ.

### 4.7 Lên làm Địa chủ
- Sở hữu **từ 5 ô** thì mở khóa thuê NPC.
- Trên mỗi ô của mình có công tắc **"Giao cho NPC"**. Khi bật, việc nào trên ô đó tồn tại đủ **20 giây** thì NPC làm, và người chơi trả công theo mục 5.2.
- NPC lấy giống và phân từ kho người chơi.
- Thiếu Xu hoặc vật tư: NPC dừng ở ô đó, game hiện thông báo. NPC làm tiếp khi đủ điều kiện.
- Người chơi vẫn tự làm được trên ô đã giao cho NPC. Khi đó không phải trả công.

### 4.8 Thời gian
- Client gọi `tick()` mỗi giây. Thời gian chỉ trôi khi game đang mở và tab đang hiện. Mở các bảng giao diện không dừng thời gian.

### 4.9 Ngày, đêm và tổng kết ngày
- Một ngày trong game chạy từ **6:00 tới 22:00**, kéo dài **360 giây thật**. Giờ trong game = 6 + 16 × (số giây đã trôi trong ngày / 360).
- Ngày đầu tiên là Ngày 1.
- Lúc 22:00: game dừng (lúa không lớn, không có trừ điểm, NPC không làm), mở **bảng tổng kết ngày**. Trong lúc bảng đang mở, mọi hành động bị từ chối với mã `DAY_ENDED`, trừ "Ngủ – sang ngày mới" và đánh dấu đã xem hướng dẫn.
- Bấm **"Ngủ – sang ngày mới"**: sang ngày kế tiếp lúc 6:00. Đêm bị bỏ qua, lúa không lớn thêm.
- Số liệu tổng kết, tính từ 6:00 tới 22:00 của ngày đó:
  - Số việc làm thuê đã làm, tiền công nhận được.
  - Lúa thu hoạch được (kg, chỉ ô của người chơi), tiền bán lúa.
  - Tiền mua giống và phân; tiền mua đất và nâng cấp công cụ; tiền trả công NPC.
  - Lãi/lỗ trong ngày = Xu lúc 22:00 − Xu lúc 6:00; Xu hiện có.
- Đóng game giữa chừng thì lần sau chơi tiếp đúng giờ đó. Đóng khi bảng tổng kết đang mở thì lần sau bảng hiện lại.
- Giai đoạn 2 (nhiều người chơi) sẽ không dừng thế giới; mỗi người tự xem tổng kết. Không thuộc phạm vi Giai đoạn 1.

## 5. Bảng số liệu (`config.ts`)

### 5.1 Chung
| Khóa | Giá trị |
|---|---|
| Xu ban đầu | 50 |
| Số ô | 20 (Địa chủ: 1–12, rao bán: 13–20) |
| Giá đất | 2.000 Xu/ô |
| Giống | 30 Xu/bao |
| Phân | 40 Xu/bao |
| Giá lúa Địa chủ mua | 8 Xu/kg |
| Năng suất | tối thiểu 40 kg, tối đa 100 kg mỗi ô |
| Nâng cấp công cụ | cấp 2: 300 Xu · cấp 3: 1.000 Xu |
| Số ô để mở khóa thuê NPC | 5 |
| Việc chờ trước khi người làm của Địa chủ làm thay | 60 giây |
| Việc chờ trước khi NPC của người chơi làm | 20 giây |
| Độ dài một ngày | 360 giây thật, từ 6:00 tới 22:00 |

### 5.2 Tiền công (mỗi ô, mỗi lần)
| Việc | Xu |
|---|---|
| Cày bừa | 15 |
| Gieo mạ | 10 |
| Nhổ mạ và cấy | 20 |
| Tưới | 5 |
| Tháo nước | 5 |
| Bón phân | 10 |
| Làm cỏ | 10 |
| Bắt sâu | 10 |
| Gặt | 20 |
| Tuốt và phơi | 15 |

### 5.3 Nhịp tiến triển dự kiến (để kiểm tra cân bằng)
- Một vụ khoảng 17 phút. Làm thuê khoảng 8 ô mỗi vụ thì được khoảng 900 Xu.
- Ô đầu tiên: khoảng 2,5 vụ (chừng 45 phút chơi).
- Một ô chăm tốt: 800 Xu − 70 Xu vật tư = khoảng 730 Xu lãi mỗi vụ.

## 6. Màn hình và điều khiển
Chỉ hỗ trợ máy tính có bàn phím và chuột.

### 6.1 Màn hình vào game
Một khung giữa màn hình, theo thứ tự từ trên xuống:
1. Tên game **"Làng Lúa"** và dòng phụ "Cày cấy, làm thuê và trở thành Địa chủ".
2. **Có bản lưu:** nút lớn "Chơi tiếp" kèm dòng nhỏ `<tên> · Ngày <n> · <Xu> Xu · <số ô> ô đất`, bên dưới là nút "Chơi mới". "Chơi mới" hỏi xác nhận trước khi xóa bản lưu, rồi chuyển sang ô nhập tên.
   **Chưa có bản lưu:** ô nhập tên (2–16 ký tự, bỏ khoảng trắng hai đầu) và nút "Vào làng".
3. Nút "Bảng giá & cách chơi" mở bảng hướng dẫn (mục 6.2).
4. Mục **ĐIỀU KHIỂN**: danh sách phím như bảng 6.3, mỗi dòng có ô phím bên trái và mô tả bên phải.

Không có chọn ngôn ngữ và âm lượng ở Giai đoạn 1.

### 6.2 Hướng dẫn
- Tự mở khi chơi lần đầu. Sau đó mở bằng phím H hoặc nút "?".
- 5 thẻ: Điều khiển · Tiền công · Giá cả · Thời gian và chăm sóc · Lộ trình.
- Mọi con số lấy từ `config.ts`.

### 6.3 Phím
| Phím | Chức năng |
|---|---|
| W A S D, Shift | Đi, chạy |
| Chuột | Nhìn. Bấm vào khung game để khóa con trỏ, Esc để nhả |
| 1–6 | Chọn công cụ |
| Giữ chuột trái | Thao tác lên ô đang nhìn |
| E | Mở nhà Địa chủ khi đứng gần |
| Tab | Bảng ô 1–20 |
| I | Kho |
| J | Bảng việc |
| H | Hướng dẫn |
| Esc | Menu: tiếp tục, hướng dẫn, lưu, về màn hình đầu |

### 6.4 HUD
- Góc trái trên: tên và Xu.
- Góc phải trên: đồng hồ, ví dụ `Ngày 3 · 14:20`.
- Giữa: tâm ngắm. Khi nhìn vào ô thì hiện số ô, chủ, giai đoạn, nước, sức khỏe, việc cần làm và tiền công (nếu là ruộng Địa chủ). Thanh tiến trình khi đang thao tác.
- Giữa dưới: thanh 6 công cụ. Tay cầm công cụ hiện trong cảnh 3D.
- Góc phải: thông báo ngắn tự ẩn sau 4 giây.

### 6.5 Các bảng
- **Bảng ô (Tab):** lưới 4 × 5. Mỗi ô hiện số, chủ (Địa chủ / Bạn / Đang bán), giai đoạn, biểu tượng 💧 🌿 🐛 🌾. Bấm vào ô thì dịch chuyển tới đứng trước ô, mặt hướng vào ruộng.
- **Bảng việc (J):** việc trên ruộng Địa chủ, tiền công, số giây còn lại. Bấm vào việc để dịch chuyển tới ô.
- **Nhà Địa chủ (E):** các thẻ Bán lúa · Mua giống/phân · Mua đất · Nâng cấp công cụ · Thuê NPC (khóa khi chưa đủ 5 ô; mở thì hiện danh sách ô của người chơi với công tắc "Giao cho NPC").
- **Kho (I):** giống, phân, lúa (kg), cấp công cụ, các ô sở hữu.
- **Tổng kết ngày:** tự mở lúc 22:00, hiện các số liệu ở mục 4.9 và nút "Ngủ – sang ngày mới". Không đóng được bằng Esc.

## 7. Thế giới 3D
- Cánh đồng 4 × 5 ô có bờ ruộng, kênh nước, nhà Địa chủ tường gạch mái ngói có sân phơi, hàng dừa, bụi tre, cây rơm, bầu trời xanh.
- Hình mỗi giai đoạn: đất khô nâu → đất bùn → mạ lấm tấm → lúa xanh cao dần → bông trĩu → vàng → bó lúa. Mặt nước cao thấp theo mực nước. Cỏ và sâu hiện thành chấm trên ô. Ô đang bán có cọc biển "Bán".
- Cây lúa vẽ bằng instancing.
- Địa chủ NPC đứng trước nhà. NPC làm thuê đi tới ô, làm việc rồi đi tiếp. NPC chỉ để nhìn; luật chơi do `core` quyết định.
- Ánh sáng theo giờ: 6:00–17:00 trời xanh, nắng; 17:00–19:00 hoàng hôn cam; 19:00–22:00 tối có trăng, cửa sổ nhà Địa chủ sáng đèn. Chuyển màu mượt.
- Va chạm: hình hộp quanh nhà và giới hạn rìa bản đồ, không dùng thư viện vật lý.

## 8. Lưu dữ liệu
- Trạng thái `core` lưu thành JSON trong localStorage, khóa `rice-game-save`, kèm trường `version`.
- Tự động lưu mỗi 10 giây, sau mỗi giao dịch (mua, bán, nâng cấp, thuê) và khi đóng tab. Có nút lưu trong menu Esc.
- Bản lưu phiên bản cũ đi qua hàm chuyển đổi. Bản lưu hỏng hoặc không đọc được thì báo lỗi và cho chọn chơi mới; không làm crash game.
- Mọi lần đọc/ghi localStorage bọc trong try/catch. Không ghi được thì vẫn chơi bình thường và hiện cảnh báo.

## 9. Xử lý lỗi
- `applyAction` trả về mã lỗi thay vì ném ngoại lệ. Các mã: `WRONG_STAGE`, `WRONG_TOOL`, `NOT_ENOUGH_XU`, `NO_SEED`, `NO_FERTILIZER`, `NOT_OWNER`, `NOT_FOR_SALE`, `NO_JOB`, `NPC_LOCKED`, `MAX_LEVEL`, `NOT_ENOUGH_RICE`, `DAY_ENDED`, `INVALID_AMOUNT` (số lượng mua/bán không phải số nguyên ≥ 1).
- Client đổi mã lỗi thành thông báo tiếng Việt, ví dụ "Ô này chưa cày, chưa gieo mạ được".

## 10. Kiểm thử
- **`core` (Vitest):**
  - từng chuyển giai đoạn và thời gian tự lớn;
  - trừ sức khỏe do thiếu nước, cỏ, sâu, không bón phân, không tháo nước;
  - công thức năng suất và số kg bị mất khi chín quá lâu;
  - trả công làm thuê, người làm Địa chủ làm thay sau 60 giây;
  - mua đất, giống, phân, bán lúa, nâng cấp;
  - mở khóa và hoạt động của NPC, NPC dừng khi thiếu Xu hoặc vật tư;
  - ngày kết thúc đúng 360 giây, số liệu tổng kết, chặn hành động khi hết ngày, sang ngày mới;
  - mọi mã lỗi;
  - cùng seed thì cùng kết quả.
- **Client:** danh sách kiểm tra bằng tay cho từng màn hình và phím. Đo khung hình bằng công cụ của trình duyệt.

## 11. Không làm ở Giai đoạn 1
Nhiều người chơi, server, tài khoản, điện thoại, âm thanh và âm lượng, đa ngôn ngữ, thời tiết, giá lúa dao động, giao dịch giữa người chơi.
