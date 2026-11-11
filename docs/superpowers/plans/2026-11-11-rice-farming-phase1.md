# Game trồng lúa – Giai đoạn 1: Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Game trồng lúa góc nhìn thứ nhất, một người chơi, chạy trên trình duyệt. Người chơi đi từ làm thuê → mua đất → lên Địa chủ thuê NPC. Đăng trên GitHub Pages.

**Architecture:** Gói `@rice/core` (TypeScript thuần) chứa toàn bộ luật chơi: `createNewGame`, `applyAction`, `tick`, có seed ngẫu nhiên và không phụ thuộc trình duyệt. Gói `@rice/client` (Vite + React + react-three-fiber) chỉ hiển thị trạng thái và gửi hành động qua store Zustand, lưu vào localStorage. Giai đoạn 2 sẽ đưa `core` lên server Colyseus mà không phải sửa.

**Tech Stack:** TypeScript, npm workspaces, Node ≥ 20, Vitest, Vite, React 18, three, @react-three/fiber, @react-three/drei, zustand, GitHub Actions + GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-11-rice-farming-phase1-design.md`. Người triển khai đọc spec trước mỗi task; mọi con số lấy từ spec mục 5 và chỉ nằm trong `packages/core/src/config.ts`.

## Global Constraints

- `packages/core` không import từ `client`, không dùng `window`, DOM, `Date.now()`, `Math.random()`. Ngẫu nhiên chỉ đến từ `rng.ts` với trạng thái lưu trong `GameState.rngState`.
- Không hard-code con số luật chơi ngoài `config.ts`. Client và màn hướng dẫn đọc `CONFIG`.
- `applyAction` không ném ngoại lệ với đầu vào sai; trả `{ ok: false, error }`.
- `applyAction` và `tick` không sửa trạng thái đầu vào (dùng `structuredClone` rồi sửa bản sao).
- Mọi chữ hiển thị cho người chơi bằng tiếng Việt.
- Chỉ hỗ trợ máy tính (bàn phím + chuột).
- Khóa localStorage: `rice-game-save`. `GameState.version = 1`.
- Vite `base: './'` để chạy dưới đường dẫn con của GitHub Pages.
- Mỗi task kết thúc bằng `npm test` xanh (khi có test) và một commit. Commit kết thúc bằng dòng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Tick với `dt` lớn** (trình duyệt trì hoãn `setInterval`, hoặc tab vừa hiện lại): `tick(s, 10)` phải cho kết quả giống hệt mười lần `tick(s, 1)`, và client giới hạn `dt` tối đa 5 giây mỗi lần gọi. Test ở Task 5.
2. **Số lượng mua/bán không hợp lệ** (0, âm, số lẻ, `NaN`): trả `INVALID_AMOUNT`, trạng thái không đổi. Test ở Task 4.
3. **Bản lưu hỏng hoặc sai phiên bản** (JSON lỗi, thiếu trường, `version` lạ): `load()` trả `{ status: 'corrupt' }`, game không crash và cho chơi mới. Test ở Task 7.
4. **Tên người chơi** có khoảng trắng hai đầu, quá ngắn, quá dài hoặc chỉ toàn khoảng trắng: cắt khoảng trắng hai đầu, chỉ nhận 2–16 ký tự. Test ở Task 7.
5. **Việc bị làm mất trong lúc người chơi đang giữ chuột** (người làm của Địa chủ làm thay, hoặc ô chuyển giai đoạn): hành động gửi lên bị từ chối bằng `NO_JOB`/`WRONG_STAGE`, không trả công hai lần, client hiện thông báo. Test ở Task 6. Thông báo NPC bị chặn chỉ phát một lần khi trạng thái chuyển sang bị chặn, không phát mỗi giây. Test ở Task 6.

---

## Cấu trúc file

```
package.json                         workspaces, scripts test/dev/build
tsconfig.base.json
.github/workflows/deploy.yml
docs/CREDITS.md
packages/core/
  package.json  tsconfig.json  vitest.config.ts
  src/index.ts          re-export mọi thứ public
  src/config.ts         CONFIG + kiểu Stage, Task, ToolId
  src/rng.ts            nextRandom
  src/state.ts          GameState, PlotState, createNewGame
  src/tasks.ts          availableTasks, performTaskOnPlot (biến đổi một ô)
  src/actions.ts        Action, GameEvent, ErrorCode, ActionResult
  src/reducer.ts        applyAction
  src/tick.ts           tick (lớn lên, nước, phạt, sự kiện, người làm, NPC)
  src/*.test.ts
packages/client/
  package.json  tsconfig.json  vite.config.ts  index.html
  src/main.tsx  src/App.tsx
  src/game/store.ts       zustand: state, dispatch, toasts, ui panel, player pose
  src/game/save.ts        createSaveStore, migrate
  src/game/loop.ts        useGameLoop: tick mỗi giây, dừng khi tab ẩn, tự lưu
  src/game/layout.ts      vị trí 3D của ô, nhà, điểm dịch chuyển
  src/game/name.ts        validatePlayerName
  src/scene/World.tsx     Canvas, trời, ánh sáng, mặt đất, kênh
  src/scene/Plot.tsx      một ô ruộng theo giai đoạn
  src/scene/RiceField.tsx cây lúa instancing
  src/scene/Village.tsx   nhà Địa chủ, sân phơi, dừa, tre, rơm, Địa chủ NPC
  src/scene/Workers.tsx   NPC làm thuê đi lại
  src/scene/Player.tsx    điều khiển góc nhìn thứ nhất, va chạm, raycast
  src/scene/HeldTool.tsx  tay cầm công cụ
  src/ui/messages.ts      ERROR_MESSAGES, STAGE_LABELS, TASK_LABELS, TOOL_LABELS
  src/ui/StartScreen.tsx  src/ui/Tutorial.tsx  src/ui/Hud.tsx
  src/ui/PlotBoard.tsx    src/ui/JobBoard.tsx  src/ui/Inventory.tsx
  src/ui/LandlordHouse.tsx src/ui/PauseMenu.tsx src/ui/Toasts.tsx
  src/**/*.test.ts
```

---

### Task 1: Khung monorepo, config và RNG

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `.gitignore` (thêm `node_modules`, `dist`), `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/vitest.config.ts`, `packages/core/src/config.ts`, `packages/core/src/rng.ts`, `packages/core/src/index.ts`
- Test: `packages/core/src/config.test.ts`, `packages/core/src/rng.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type Stage = 'dry'|'plowed'|'seedling'|'seedlingReady'|'young'|'green'|'flowering'|'ripe'|'bundled'
  type Task = 'plow'|'sow'|'transplant'|'water'|'drain'|'fertilize'|'weed'|'pestControl'|'harvest'|'thresh'
  type ToolId = 'hoe'|'seedBasket'|'waterScoop'|'fertilizerBag'|'sickle'|'hands'
  type ToolLevel = 1|2|3
  const CONFIG: {
    startingXu: 50; plotCount: 20; landlordPlotIds: number[] /*1..12*/; forSalePlotIds: number[] /*13..20*/;
    landPrice: 2000; seedPrice: 30; fertilizerPrice: 40; ricePricePerKg: 8;
    yieldKg: { min: 40; max: 100 };
    toolUpgradeCost: { 2: 300; 3: 1000 }; toolSpeedMultiplier: { 1: 1; 2: 0.7; 3: 0.4 };
    npcUnlockPlotCount: 5; landlordJobTimeoutSec: 60; playerNpcDelaySec: 20;
    stageDurationSec: { seedling: 180; young: 300; green: 300; flowering: 240 };
    water: { start: 100; drainPer10s: 5; threshold: 30; drainingStages: Stage[] /*seedling, seedlingReady, young, green*/ };
    penalty: { dryPer10s: 2; weedPer10s: 1; pestPer10s: 2; noFertilizer: 15; noDrain: 10; overripeAfterSec: 180; overripeKgPer10s: 2 };
    pests: { checkIntervalSec: 60; weedChance: 0.3; pestChance: 0.25; weedStages: Stage[] /*young, green*/; pestStages: Stage[] /*green, flowering*/ };
    wages: Record<Task, number>; // plow15 sow10 transplant20 water5 drain5 fertilize10 weed10 pestControl10 harvest20 thresh15
    tasks: Record<Task, { tool: ToolId; baseSec: number }>; // spec 4.4
    autosaveIntervalSec: 10;
  }
  function nextRandom(rngState: number): [value: number /*[0,1)*/, nextState: number]  // mulberry32
  ```
- `packages/core/package.json`: `"name": "@rice/core"`, `"main": "src/index.ts"`, `"types": "src/index.ts"`, script `"test": "vitest run"`.
- Root `package.json`: `"workspaces": ["packages/*"]`, scripts `"test": "npm test -w @rice/core -w @rice/client --if-present"`, `"dev": "npm run dev -w @rice/client"`, `"build": "npm run build -w @rice/client"`.

- [ ] **Step 1: Tạo các file khung, chạy `npm install -D typescript vitest -w @rice/core`**
- [ ] **Step 2: Viết test**
  ```ts
  // config.test.ts
  it('khớp số liệu spec', () => {
    expect(CONFIG.landPrice).toBe(2000); expect(CONFIG.startingXu).toBe(50)
    expect(CONFIG.landlordPlotIds).toEqual([1,2,3,4,5,6,7,8,9,10,11,12])
    expect(CONFIG.forSalePlotIds).toEqual([13,14,15,16,17,18,19,20])
    expect(CONFIG.wages).toEqual({ plow:15, sow:10, transplant:20, water:5, drain:5, fertilize:10, weed:10, pestControl:10, harvest:20, thresh:15 })
    expect(CONFIG.tasks.plow).toEqual({ tool:'hoe', baseSec:6 })
    expect(CONFIG.tasks.thresh).toEqual({ tool:'hands', baseSec:5 })
  })
  // rng.test.ts
  it('cùng seed cùng dãy', () => { /* 5 lần nextRandom từ seed 42 hai lần → mảng bằng nhau */ })
  it('giá trị trong [0,1)', () => { /* 1000 lần, mọi v >= 0 && v < 1 */ })
  ```
- [ ] **Step 3: Chạy `npm test -w @rice/core`** → FAIL (chưa có export)
- [ ] **Step 4: Viết `config.ts` (đủ bảng `tasks` theo spec 4.4: sow 4s seedBasket, transplant 6s seedBasket, water/drain 2s waterScoop, fertilize 3s fertilizerBag, harvest 6s sickle, weed 3s sickle, pestControl 3s hands), `rng.ts`, `index.ts`**
- [ ] **Step 5: Chạy `npm test -w @rice/core`** → PASS
- [ ] **Step 6: Commit** `chore: scaffold monorepo with core config and rng`

---

### Task 2: Trạng thái game và danh sách việc khả dụng

**Files:**
- Create: `packages/core/src/state.ts`, `packages/core/src/tasks.ts` (phần `availableTasks`)
- Test: `packages/core/src/state.test.ts`, `packages/core/src/tasks.test.ts`

**Interfaces:**
- Consumes: `CONFIG`, `Stage`, `Task`, `ToolId`, `ToolLevel`, `nextRandom`
- Produces:
  ```ts
  type PlotOwner = 'landlord'|'player'|'forSale'
  interface PlotState {
    id: number; owner: PlotOwner; stage: Stage; stageElapsedSec: number
    water: number; health: number; fertilized: boolean; drained: boolean
    hasWeeds: boolean; hasPests: boolean; lostKg: number
    tenSecAccum: number; pestCheckAccum: number
    jobAgeSec: Partial<Record<Task, number>>   // tuổi của từng việc đang khả dụng
    npcEnabled: boolean; npcBlocked: ErrorCode | null
  }
  interface GameState {
    version: 1; playerName: string; xu: number
    inventory: { seeds: number; fertilizer: number; riceKg: number }
    toolLevels: Record<ToolId, ToolLevel>
    plots: PlotState[]          // plots[i].id === i + 1
    rngState: number; timeSec: number; tutorialSeen: boolean
  }
  function createNewGame(playerName: string, seed: number): GameState
  function freshPlot(id: number, owner: PlotOwner): PlotState   // dry, water 0, health 100, mọi cờ false
  function availableTasks(plot: PlotState): Task[]
  ```
- `ErrorCode` được khai báo trong `actions.ts` ở bước này (chỉ kiểu): `'WRONG_STAGE'|'WRONG_TOOL'|'NOT_ENOUGH_XU'|'NO_SEED'|'NO_FERTILIZER'|'NOT_OWNER'|'NOT_FOR_SALE'|'NO_JOB'|'NPC_LOCKED'|'MAX_LEVEL'|'NOT_ENOUGH_RICE'|'INVALID_AMOUNT'`.

**Luật `availableTasks`** (spec 4.5): dry→plow; plowed→sow; seedlingReady→transplant; ripe→harvest; bundled→thresh. Cộng thêm theo điều kiện: `water` khi stage thuộc `drainingStages` và `water < threshold`; `fertilize` khi stage ∈ {young, green} và `!fertilized`; `weed` khi `hasWeeds`; `pestControl` khi `hasPests`; `drain` khi stage = flowering và `!drained`. Ô `forSale` trả mảng rỗng.

**`createNewGame`:** ô 1–12 `landlord`, 13–20 `forSale`. Mỗi ô Địa chủ nhận một stage ngẫu nhiên trong `['dry','plowed','seedling','young','green','flowering','ripe']` và `stageElapsedSec` ngẫu nhiên nhỏ hơn thời lượng stage (0 với stage không có thời lượng). Cờ phải nhất quán: stage từ seedling trở đi thì `water = 100`; flowering/ripe thì `fertilized = true`; ripe thì `drained = true`.

- [ ] **Step 1: Viết test**
  ```ts
  it('game mới', () => { const s = createNewGame('Tí', 1)
    expect(s.xu).toBe(50); expect(s.inventory).toEqual({ seeds:0, fertilizer:0, riceKg:0 })
    expect(s.plots).toHaveLength(20)
    expect(s.plots.filter(p => p.owner==='landlord').map(p=>p.id)).toEqual([1,2,3,4,5,6,7,8,9,10,11,12])
    expect(s.plots.slice(12).every(p => p.owner==='forSale' && p.stage==='dry')).toBe(true)
    expect(Object.values(s.toolLevels).every(l => l===1)).toBe(true) })
  it('cùng seed cùng ruộng', () => expect(createNewGame('A',7)).toEqual(createNewGame('A',7)))
  it('có ít nhất 1 việc lúc đầu với seed 1..20', () => { /* với mỗi seed, tổng availableTasks trên ô Địa chủ > 0 */ })
  it('availableTasks theo stage', () => { /* dry→['plow']; plowed→['sow']; ripe→['harvest']; bundled→['thresh'] */ })
  it('tưới khi nước < 30', () => { /* young, water 29 → chứa 'water'; water 30 → không */ })
  it('bón phân một lần', () => { /* green !fertilized → chứa 'fertilize'; fertilized → không */ })
  it('tháo nước ở trổ bông', () => { /* flowering !drained → chứa 'drain' */ })
  it('ô đang bán không có việc', () => { /* forSale dry → [] */ })
  ```
- [ ] **Step 2: Chạy `npm test -w @rice/core`** → FAIL
- [ ] **Step 3: Viết `state.ts`, `availableTasks` trong `tasks.ts`, kiểu `ErrorCode` trong `actions.ts`**
- [ ] **Step 4: Chạy `npm test -w @rice/core`** → PASS
- [ ] **Step 5: Commit** `feat(core): game state and available tasks`

---

### Task 3: Thực hiện công đoạn (`performTask`)

**Files:**
- Modify: `packages/core/src/tasks.ts` (thêm `performTaskOnPlot`, `computeYieldKg`)
- Modify: `packages/core/src/actions.ts` (thêm `Action`, `GameEvent`, `ActionResult`)
- Create: `packages/core/src/reducer.ts`
- Test: `packages/core/src/perform.test.ts`

**Interfaces:**
- Consumes: `GameState`, `PlotState`, `availableTasks`, `freshPlot`, `CONFIG`
- Produces:
  ```ts
  type Action =
    | { type: 'performTask'; plotId: number; task: Task; tool: ToolId }
    | { type: 'buySeeds'; qty: number } | { type: 'buyFertilizer'; qty: number }
    | { type: 'buyLand'; plotId: number } | { type: 'sellRice'; kg: number }
    | { type: 'upgradeTool'; tool: ToolId } | { type: 'setNpc'; plotId: number; enabled: boolean }
    | { type: 'markTutorialSeen' }
  type GameEvent =
    | { type: 'wagePaid'; plotId: number; task: Task; amount: number }
    | { type: 'riceHarvested'; plotId: number; kg: number; toPlayer: boolean }
    | { type: 'landlordWorkerDid'; plotId: number; task: Task }
    | { type: 'npcDid'; plotId: number; task: Task; wage: number }
    | { type: 'npcBlocked'; plotId: number; reason: ErrorCode }
    | { type: 'stageChanged'; plotId: number; stage: Stage }
    | { type: 'weedsAppeared'; plotId: number } | { type: 'pestsAppeared'; plotId: number }
  type ActionResult = { ok: true; state: GameState; events: GameEvent[] } | { ok: false; error: ErrorCode }
  function computeYieldKg(plot: PlotState): number   // max(min, round(40 + 60*health/100) - lostKg)
  function performTaskOnPlot(plot: PlotState, task: Task): { plot: PlotState; harvestedKg?: number }
    // chỉ biến đổi ô; giả định task đã được kiểm tra hợp lệ
  function applyAction(state: GameState, action: Action): ActionResult
  ```

**Biến đổi ô** (spec 4.2–4.3): plow dry→plowed; sow plowed→seedling, `water = 100`; transplant seedlingReady→young; water → `water = 100`; drain → `water = 0, drained = true`; fertilize → `fertilized = true`; weed → `hasWeeds = false`; pestControl → `hasPests = false`; harvest ripe→bundled; thresh → `harvestedKg = computeYieldKg(plot)`, ô thành `freshPlot(id, owner)` (giữ `npcEnabled`). Đổi stage thì `stageElapsedSec = 0`. Mọi task xong thì xóa `jobAgeSec[task]`.

**Kiểm tra `performTask` theo thứ tự:** plotId không tồn tại → `NOT_OWNER`; `forSale` → `NOT_OWNER`; `tool !== CONFIG.tasks[task].tool` → `WRONG_TOOL`; ngoại lệ: trên ô người chơi, `water` luôn hợp lệ khi stage ∈ `drainingStages` (tưới bất cứ lúc nào, kể cả nước ≥ 30; `availableTasks` vẫn giữ luật < 30 để NPC không tưới liên tục); task không có trong `availableTasks`: nếu task là loại gắn với stage (plow, sow, transplant, harvest, thresh, drain) và stage không khớp → `WRONG_STAGE`, ngược lại → `NO_JOB`; ô người chơi: sow cần `seeds ≥ 1` (`NO_SEED`), fertilize cần `fertilizer ≥ 1` (`NO_FERTILIZER`), trừ kho. Ô Địa chủ: cộng `CONFIG.wages[task]` vào `xu`, phát `wagePaid`. Thresh trên ô người chơi cộng `riceKg`; phát `riceHarvested` với `toPlayer` đúng.

- [ ] **Step 1: Viết test**
  ```ts
  it('cày ruộng Địa chủ được 15 Xu', ...)        // xu 50 → 65, stage plowed, event wagePaid amount 15
  it('sai công cụ → WRONG_TOOL', ...)
  it('cấy khi chưa cày → WRONG_STAGE', ...)
  it('làm cỏ khi không có cỏ → NO_JOB', ...)
  it('ô đang bán → NOT_OWNER', ...)
  it('gieo mạ ô mình không có giống → NO_SEED; có giống thì trừ 1 và không trả công', ...)
  it('bón phân ô mình trừ 1 phân', ...)
  it('tưới ô mình khi nước 80 → ok, nước 100; ô Địa chủ nước 80 → NO_JOB', ...)
  it('năng suất', () => { /* health 100 lostKg 0 → 100; health 0 → 40; health 50 → 70; health 100 lostKg 70 → 40 */ })
  it('tuốt ô mình cộng lúa vào kho và ô về dry, health 100', ...)
  it('tuốt ô Địa chủ trả 15 Xu, kho lúa không đổi', ...)
  it('không sửa state đầu vào', () => { /* deep-equal bản chụp trước/sau */ })
  ```
- [ ] **Step 2: Chạy** → FAIL
- [ ] **Step 3: Viết code** (`applyAction` chỉ xử lý `performTask` ở task này; các type khác tạm trả `{ ok:false, error:'NO_JOB' }`)
- [ ] **Step 4: Chạy `npm test -w @rice/core`** → PASS
- [ ] **Step 5: Commit** `feat(core): perform farming tasks with wages and yield`

---

### Task 4: Giao dịch ở nhà Địa chủ

**Files:**
- Modify: `packages/core/src/reducer.ts`
- Test: `packages/core/src/shop.test.ts`

**Interfaces:**
- Consumes: `applyAction`, `Action`, `CONFIG`
- Produces: `applyAction` xử lý đủ mọi `Action`. Thêm helper export `ownedPlotCount(state): number`, `isNpcUnlocked(state): boolean` (≥ `CONFIG.npcUnlockPlotCount`).

**Luật:**
- `qty`/`kg` phải là số nguyên ≥ 1, ngược lại → `INVALID_AMOUNT`.
- buySeeds/buyFertilizer: thiếu Xu → `NOT_ENOUGH_XU`.
- buyLand: ô không phải `forSale` → `NOT_FOR_SALE`; thiếu 2.000 Xu → `NOT_ENOUGH_XU`; thành công thì `owner = 'player'`.
- sellRice: `kg > riceKg` → `NOT_ENOUGH_RICE`; cộng `kg × 8`, không thuế.
- upgradeTool: cấp 3 → `MAX_LEVEL`; giá theo cấp đích; thiếu Xu → `NOT_ENOUGH_XU`.
- setNpc: chưa mở khóa → `NPC_LOCKED`; ô không phải của người chơi → `NOT_OWNER`; khi tắt thì `npcBlocked = null`.
- markTutorialSeen: `tutorialSeen = true`.

- [ ] **Step 1: Viết test**
  ```ts
  it('mua 2 giống tốn 60 Xu', ...)
  it.each([0, -1, 1.5, NaN])('qty %s → INVALID_AMOUNT, state không đổi', ...)
  it('mua đất 2000 Xu: thiếu tiền → NOT_ENOUGH_XU; đủ → owner player, xu giảm 2000', ...)
  it('mua ô Địa chủ → NOT_FOR_SALE; mua ô đã sở hữu → NOT_FOR_SALE', ...)
  it('bán 100 kg được 800 Xu, không thuế', ...)
  it('bán nhiều hơn kho → NOT_ENOUGH_RICE', ...)
  it('nâng cuốc 1→2 tốn 300, 2→3 tốn 1000, cấp 3 → MAX_LEVEL', ...)
  it('setNpc khi có 4 ô → NPC_LOCKED; 5 ô → ok; ô Địa chủ → NOT_OWNER', ...)
  ```
- [ ] **Step 2: Chạy** → FAIL
- [ ] **Step 3: Viết code**
- [ ] **Step 4: Chạy `npm test -w @rice/core`** → PASS
- [ ] **Step 5: Commit** `feat(core): landlord shop, land purchase, rice sales, upgrades`

---

### Task 5: Thời gian trôi – lúa lớn, nước, cỏ, sâu, phạt

**Files:**
- Create: `packages/core/src/tick.ts`
- Test: `packages/core/src/tick-growth.test.ts`

**Interfaces:**
- Consumes: `GameState`, `PlotState`, `CONFIG`, `nextRandom`, `availableTasks`
- Produces: `tick(state: GameState, dtSeconds: number): { state: GameState; events: GameEvent[] }`. `dtSeconds` làm tròn xuống thành số giây nguyên; mỗi giây chạy `stepOneSecond` (nội bộ). Giá trị ≤ 0 thì trả về state y nguyên.

**Mỗi giây, với từng ô không phải `forSale`, theo thứ tự:**
1. `stageElapsedSec++`, `timeSec++` (một lần cho cả game).
2. `tenSecAccum++`; khi đạt 10 thì về 0 và: nếu stage ∈ `drainingStages` thì `water = max(0, water − 5)`, và nếu `water < 30` thì `health −= 2`; có cỏ thì `health −= 1`; có sâu thì `health −= 2`; nếu ripe và `stageElapsedSec > 180` thì `lostKg += 2`. Kẹp `health` trong [0, 100].
3. `pestCheckAccum++`; khi đạt 60 thì về 0 và: stage ∈ `weedStages` và chưa có cỏ → rút ngẫu nhiên, `< 0.3` thì có cỏ (phát `weedsAppeared`); stage ∈ `pestStages` và chưa có sâu → `< 0.25` thì có sâu (phát `pestsAppeared`). Mỗi lần rút cập nhật `state.rngState`.
4. Tự chuyển stage khi `stageElapsedSec ≥ duration`: seedling→seedlingReady, young→green, green→flowering (nếu `!fertilized` thì `health −= 15`), flowering→ripe (nếu `!drained` thì `health −= 10`). Đặt `stageElapsedSec = 0`, phát `stageChanged`.

Ô của người chơi chịu cùng luật này.

- [ ] **Step 1: Viết test**
  ```ts
  it('mạ non sau 180 giây thành mạ đủ lớn', ...)
  it('cả vụ tự lớn: young 300 → green 300 → flowering 240 → ripe', ...)
  it('nước giảm 5 mỗi 10 giây ở lúa non', ...)       // 100 → 95 sau 10s
  it('thiếu nước trừ 2 sức khỏe mỗi 10 giây', ...)    // water 25 → health 98 sau 10s
  it('không bón phân bị trừ 15 khi rời lúa xanh', ...)
  it('không tháo nước bị trừ 10 khi vào chín', ...)
  it('chín quá 180 giây mất 2 kg mỗi 10 giây', ...)  // sau 200 giây ở ripe: lostKg 4
  it('cỏ và sâu xuất hiện tái lập theo seed', ...)
  it('tick(s,10) bằng 10 lần tick(s,1)', ...)        // Review Focus 1
  it('dt ≤ 0 không đổi state', ...)
  it('ô đang bán không đổi gì', ...)
  ```
- [ ] **Step 2: Chạy** → FAIL
- [ ] **Step 3: Viết `tick.ts`**
- [ ] **Step 4: Chạy `npm test -w @rice/core`** → PASS
- [ ] **Step 5: Commit** `feat(core): growth, water, weeds, pests and penalties over time`

---

### Task 6: Người làm của Địa chủ và NPC của người chơi

**Files:**
- Modify: `packages/core/src/tick.ts` (thêm bước 5 trong `stepOneSecond`)
- Test: `packages/core/src/tick-workers.test.ts`

**Interfaces:**
- Consumes: `availableTasks`, `performTaskOnPlot`, `CONFIG`
- Produces: thêm hành vi cho `tick`, không đổi chữ ký.

**Bước 5, mỗi giây sau bước 4:**
- Với từng task trong `availableTasks(plot)`: `jobAgeSec[task] = (jobAgeSec[task] ?? 0) + 1`; xóa các khóa không còn khả dụng.
- **Ô Địa chủ:** task nào có tuổi ≥ 60 thì `performTaskOnPlot` (không trả công người chơi, lúa không vào kho), phát `landlordWorkerDid`.
- **Ô người chơi có `npcEnabled`:** task nào có tuổi ≥ 20 thì kiểm tra: `xu ≥ wage` (nếu không thì `NOT_ENOUGH_XU`), sow cần giống (`NO_SEED`), fertilize cần phân (`NO_FERTILIZER`). Đủ thì trừ Xu và vật tư, `performTaskOnPlot`, thresh cộng `riceKg`, phát `npcDid`, `npcBlocked = null`. Thiếu thì giữ nguyên ô; nếu `npcBlocked` khác lý do mới thì gán và phát `npcBlocked` (chỉ phát khi lý do thay đổi).
- Mỗi giây mỗi ô xử lý tối đa một task (task có tuổi lớn nhất).

- [ ] **Step 1: Viết test**
  ```ts
  it('việc Địa chủ để 60 giây thì người làm làm thay, người chơi không được công', ...)
  it('người chơi làm sau khi người làm đã làm → WRONG_STAGE, không trả công', ...)  // Review Focus 5
  it('NPC làm việc ô mình sau 20 giây và trừ công', ...)    // plow: xu −15, stage plowed, event npcDid
  it('NPC dùng giống trong kho khi gieo mạ', ...)
  it('NPC thiếu Xu → npcBlocked phát đúng một lần trong 30 giây', ...)
  it('NPC tiếp tục khi có đủ Xu, npcBlocked về null', ...)
  it('NPC tuốt lúa cộng vào kho người chơi', ...)
  it('ô chưa bật NPC thì không ai làm', ...)
  ```
- [ ] **Step 2: Chạy** → FAIL
- [ ] **Step 3: Viết code**
- [ ] **Step 4: Chạy `npm test -w @rice/core`** → PASS
- [ ] **Step 5: Kiểm thử cân bằng nhanh:** thêm test `balance.test.ts`. Mô phỏng bằng script một người chơi làm mọi việc Địa chủ ngay khi xuất hiện trong 17 phút (seed 1). Ghi lại tổng Xu vào output test (`console.log`), chỉ assert > 500. Con số dùng để đối chiếu spec 5.3, không cần khớp đúng.
- [ ] **Step 6: Commit** `feat(core): landlord workers and player-hired NPCs`

---

### Task 7: Client – khung, store, lưu/tải, màn hình vào game

**Files:**
- Create: `packages/client/package.json` (`"name": "@rice/client"`, deps: `react`, `react-dom`, `three`, `@react-three/fiber`, `@react-three/drei`, `zustand`, `@rice/core`; dev: `vite`, `@vitejs/plugin-react`, `typescript`, `vitest`, `@types/react`, `@types/react-dom`, `@types/three`), `vite.config.ts` (`base: './'`), `tsconfig.json`, `index.html` (`lang="vi"`, title "Làng Lúa"), `src/main.tsx`, `src/App.tsx`, `src/game/store.ts`, `src/game/save.ts`, `src/game/loop.ts`, `src/game/name.ts`, `src/ui/StartScreen.tsx`, `src/ui/Toasts.tsx`, `src/ui/messages.ts`
- Test: `packages/client/src/game/save.test.ts`, `packages/client/src/game/name.test.ts`, `packages/client/src/ui/messages.test.ts`

**Interfaces:**
- Consumes: `createNewGame`, `applyAction`, `tick`, `GameState`, `Action`, `GameEvent`, `ErrorCode` từ `@rice/core`
- Produces:
  ```ts
  // save.ts
  type StorageLike = Pick<Storage, 'getItem'|'setItem'|'removeItem'>
  type LoadResult = { status: 'none' } | { status: 'ok'; state: GameState } | { status: 'corrupt' }
  function migrate(raw: unknown): GameState | null     // version 1: kiểm tra trường bắt buộc, trả null nếu thiếu
  function createSaveStore(storage: StorageLike | null): { load(): LoadResult; save(s: GameState): boolean; clear(): void }
    // mọi truy cập storage bọc try/catch; storage null → load none, save false
  // name.ts
  function validatePlayerName(input: string): { ok: true; name: string } | { ok: false; reason: 'tooShort'|'tooLong' }
  // messages.ts
  const ERROR_MESSAGES: Record<ErrorCode, string>; const STAGE_LABELS: Record<Stage, string>
  const TASK_LABELS: Record<Task, string>; const TOOL_LABELS: Record<ToolId, string>
  function describeEvent(e: GameEvent): string | null   // null với sự kiện không cần thông báo (stageChanged)
  // store.ts (zustand)
  type Panel = null | 'plots' | 'jobs' | 'inventory' | 'landlord' | 'tutorial' | 'pause'
  interface Toast { id: number; text: string; kind: 'info'|'error' }
  interface GameStore {
    screen: 'start' | 'playing'; game: GameState | null; panel: Panel; toasts: Toast[]
    selectedTool: ToolId; teleportTarget: number | null   // plotId, Player.tsx tiêu thụ rồi đặt null
    startNew(name: string): void; continueGame(): void; exitToStart(): void
    dispatch(a: Action): boolean            // lỗi → toast ERROR_MESSAGES; sự kiện → toast describeEvent; giao dịch thành công → save
    advance(dtSec: number): void            // gọi tick, toast sự kiện
    setPanel(p: Panel): void; selectTool(t: ToolId): void; teleportTo(plotId: number): void
    pushToast(text: string, kind?: 'info'|'error'): void  // tự xóa sau 4 giây
  }
  // loop.ts
  function useGameLoop(): void   // setInterval 1s; dt = min(5, giây thực trôi); bỏ qua khi document.hidden; save mỗi CONFIG.autosaveIntervalSec và ở 'beforeunload'
  ```

**StartScreen:** ô tên + nút "Vào làng". Nếu `load()` là `ok` thì có thêm "Chơi tiếp – <tên>" và "Chơi mới" (confirm "Xóa tiến trình cũ và chơi lại từ đầu?"). Nếu `corrupt` thì hiện "Không đọc được bản lưu cũ" và chỉ cho chơi mới. Tên không hợp lệ thì hiện lỗi dưới ô. Seed lấy từ `Date.now()` ở client. Ở task này, khi `screen === 'playing'` chỉ hiện `<pre>` gồm Xu và stage các ô để kiểm tra vòng lặp; Task 8 sẽ thay bằng 3D.

- [ ] **Step 1: Cài phụ thuộc client, `npm install`**
- [ ] **Step 2: Viết test**
  ```ts
  // name.test.ts
  it.each([['  Tí  ','Tí'], ['Nguyễn Văn A','Nguyễn Văn A']])('nhận %s', ...)
  it.each(['', '   ', 'A'])('quá ngắn: %s', ...); it('17 ký tự → tooLong', ...)
  // save.test.ts (fake storage bằng Map)
  it('lưu rồi tải ra đúng state', ...); it('chưa có → none', ...)
  it.each(['{bad json', '{"version":99}', '{"version":1}', 'null'])('hỏng → corrupt: %s', ...)  // Review Focus 3
  it('storage ném lỗi → save trả false, load none, không ném', ...)
  // messages.test.ts
  it('mọi ErrorCode, Stage, Task, ToolId đều có nhãn tiếng Việt không rỗng', ...)
  ```
- [ ] **Step 3: Chạy `npm test -w @rice/client`** → FAIL
- [ ] **Step 4: Viết code**
- [ ] **Step 5: Chạy `npm test`** → PASS cả hai gói
- [ ] **Step 6: Chạy `npm run dev`, mở trình duyệt.** Kiểm tra: nhập tên → thấy Xu 50 và stage thay đổi theo thời gian; F5 → có "Chơi tiếp"; sửa localStorage thành rác → báo không đọc được.
- [ ] **Step 7: Commit** `feat(client): app shell, store, save/load and start screen`

---

### Task 8: Thế giới 3D – làng và ruộng

**Files:**
- Create: `src/game/layout.ts`, `src/scene/World.tsx`, `src/scene/Plot.tsx`, `src/scene/RiceField.tsx`, `src/scene/Village.tsx`, `docs/CREDITS.md`
- Modify: `src/App.tsx` (thay `<pre>` bằng `<World/>`)
- Test: `packages/client/src/game/layout.test.ts`

**Interfaces:**
- Consumes: `GameStore.game.plots`
- Produces:
  ```ts
  // layout.ts – đơn vị mét, trục Y hướng lên
  const PLOT_SIZE = 8; const BUND_WIDTH = 1          // ô 8×8 m, bờ 1 m
  function plotCenter(plotId: number): [x: number, z: number]   // lưới 4 cột × 5 hàng, ô 1 ở góc gần nhà
  function teleportPose(plotId: number): { position: [number, number, number]; yaw: number }  // đứng trên bờ, cách mép ô 1 m, nhìn vào tâm ô, mắt cao 1.6 m
  const HOUSE_BOX: { min: [number, number]; max: [number, number] }   // hộp va chạm XZ
  const HOUSE_DOOR: [number, number]; const HOUSE_INTERACT_RADIUS = 4
  const WORLD_BOUNDS: { min: [number, number]; max: [number, number] }
  function plotIdAt(x: number, z: number): number | null
  ```
- `Plot.tsx` nhận `plot: PlotState`, đổi màu đất theo stage (dry `#a8875a`, plowed `#5b4632`, còn lại bùn `#4a3b2a`). Mặt nước xanh trong suốt có chiều cao `0.02 + 0.15 × water/100`. Cỏ: vài chấm xanh đậm. Sâu: vài chấm đỏ cam. Ô `forSale` có cọc biển chữ "BÁN" (drei `Text`). `userData.plotId` gắn trên mesh mặt đất cho raycast.
- `RiceField.tsx` dùng một `InstancedMesh` cho mỗi ô: 64 cụm lúa (lưới 8×8). Chiều cao và màu theo stage: seedling 0.1 m xanh nhạt, young 0.3, green 0.7 xanh `#3f9b3a`, flowering 0.9 có bông, ripe 0.9 vàng `#e2b53c`, bundled 6 bó lúa nằm, dry/plowed ẩn.
- `Village.tsx`: nhà Địa chủ (khối tường gạch `#b5523b`, mái ngói hình lăng trụ `#a63a2a`), sân phơi xi măng, Địa chủ NPC (thân trụ + đầu cầu + nón lá hình nón) đứng ở `HOUSE_DOOR`, 12 cây dừa dọc rìa, 3 bụi tre, 2 cây rơm, kênh nước dọc một cạnh cánh đồng.
- Mô hình dừng ở khối hình học trong code. Nếu tải được Kenney Nature Kit (CC0, kenney.nl/assets/nature-kit), dùng `tree_palm*.glb` cho cây dừa (đặt tại `packages/client/public/models/`). Ghi nguồn đã dùng vào `docs/CREDITS.md`.

- [ ] **Step 1: Viết test `layout.test.ts`**
  ```ts
  it('20 tâm ô khác nhau, không chồng nhau', ...)       // khoảng cách mọi cặp ≥ PLOT_SIZE
  it('plotIdAt(tâm ô n) === n với mọi n; ngoài ruộng → null', ...)
  it('teleportPose nằm ngoài ô, trong WORLD_BOUNDS, ngoài HOUSE_BOX', ...)
  ```
- [ ] **Step 2: Chạy** → FAIL
- [ ] **Step 3: Viết `layout.ts`** → test PASS
- [ ] **Step 4: Viết các component scene.** Camera tạm dùng `OrbitControls` để xem toàn cảnh; Task 9 thay bằng góc nhìn thứ nhất.
- [ ] **Step 5: `npm run dev`, kiểm tra bằng mắt:** thấy 20 ô, ruộng Địa chủ ở nhiều giai đoạn, ô 13–20 có biển "BÁN", nhà, dừa, tre. Lúa đổi hình khi stage đổi.
- [ ] **Step 6: Commit** `feat(client): village and rice field scene`

---

### Task 9: Góc nhìn thứ nhất – di chuyển, nhắm và thao tác

**Files:**
- Create: `src/scene/Player.tsx`, `src/scene/HeldTool.tsx`, `src/game/interaction.ts`
- Modify: `src/scene/World.tsx` (bỏ OrbitControls, thêm `<Player/>`, `<HeldTool/>`), `src/game/store.ts` (thêm trường dưới đây)
- Test: `packages/client/src/game/interaction.test.ts`

**Interfaces:**
- Consumes: `layout.ts`, `GameStore`, `CONFIG.tasks`, `CONFIG.toolSpeedMultiplier`, `availableTasks`
- Produces:
  ```ts
  // interaction.ts
  function taskForTool(plot: PlotState, tool: ToolId): Task | null
    // task đầu tiên trong availableTasks(plot) có CONFIG.tasks[task].tool === tool;
    // ô người chơi: thêm 'water' khi stage ∈ drainingStages (tưới bất cứ lúc nào, kể cả nước ≥ 30)
  function actionDurationSec(task: Task, level: ToolLevel): number   // baseSec × multiplier
  function moveWithCollision(from: [number, number], to: [number, number]): [number, number]
    // kẹp trong WORLD_BOUNDS, không vào HOUSE_BOX (trượt dọc cạnh)
  const INTERACT_DISTANCE = 6   // m, từ người chơi tới điểm nhắm trên ô
  // store.ts thêm
  targetPlotId: number | null; actionProgress: number | null   // 0..1 khi đang giữ chuột
  setTarget(id: number | null): void; setActionProgress(p: number | null): void
  ```
- **Player.tsx:** drei `PointerLockControls`. WASD 4 m/s, Shift 7 m/s. Mắt cao 1.6 m. Mỗi khung hình raycast từ tâm camera tới các mesh có `userData.plotId`, nhận nếu khoảng cách ≤ `INTERACT_DISTANCE` → `setTarget`. Khi `teleportTarget` khác null thì đặt camera theo `teleportPose`, rồi đặt về null. Phím 1–6 chọn công cụ theo thứ tự `hoe, seedBasket, waterScoop, fertilizerBag, sickle, hands`. Không xử lý phím khi đang mở bảng (`panel !== null`).
- **Giữ chuột trái:** nếu có target và `taskForTool` khác null thì tiến trình chạy theo `actionDurationSec`. Đổi target, nhả chuột hoặc mở bảng thì hủy (`setActionProgress(null)`). Đầy thì `dispatch({ type:'performTask', plotId, task, tool })`.
- **HeldTool.tsx:** gắn vào camera ở góc phải dưới, mỗi công cụ một hình khối đơn giản (cuốc: cán + lưỡi; cấp 2 thêm chữ "Trâu", cấp 3 "Máy" trên thanh công cụ; rổ mạ: trụ thấp có mạ xanh; gáo: bán cầu + cán; bao phân: hộp trắng; liềm: cung cong; tay: khối da). Lắc nhẹ khi đang thao tác.

- [ ] **Step 1: Viết test**
  ```ts
  it('taskForTool: dry + hoe → plow; dry + sickle → null', ...)
  it('taskForTool: ô Địa chủ young water 50 + waterScoop → null; ô mình → water', ...)
  it('taskForTool: green có cỏ + sickle → weed', ...)
  it('actionDurationSec(plow, 1/2/3) = 6 / 4.2 / 2.4', ...)
  it('moveWithCollision không đi vào nhà, không ra khỏi bản đồ', ...)
  ```
- [ ] **Step 2: Chạy** → FAIL
- [ ] **Step 3: Viết `interaction.ts`** → PASS
- [ ] **Step 4: Viết `Player.tsx`, `HeldTool.tsx`**
- [ ] **Step 5: `npm run dev` và kiểm tra:** đi lại, không xuyên nhà, không ra rìa; nhìn ô Địa chủ đang "Đất khô", cầm cuốc giữ chuột 6 giây → +15 Xu và đất chuyển màu; cầm sai công cụ thì không có thanh tiến trình; nhả giữa chừng thì hủy.
- [ ] **Step 6: Commit** `feat(client): first-person movement, targeting and hold-to-act`

---

### Task 10: HUD và các bảng

**Files:**
- Create: `src/ui/Hud.tsx`, `src/ui/PlotBoard.tsx`, `src/ui/JobBoard.tsx`, `src/ui/Inventory.tsx`, `src/ui/LandlordHouse.tsx`, `src/ui/Tutorial.tsx`, `src/ui/PauseMenu.tsx`, `src/ui/hotkeys.ts`
- Modify: `src/App.tsx`, `src/ui/messages.ts`
- Test: `packages/client/src/ui/tutorial.test.ts`, `packages/client/src/ui/jobs.test.ts`

**Interfaces:**
- Consumes: `GameStore`, `CONFIG`, `availableTasks`, `isNpcUnlocked`, `ownedPlotCount`, `HOUSE_DOOR`, `HOUSE_INTERACT_RADIUS`
- Produces:
  ```ts
  // hotkeys.ts – một listener keydown toàn cục
  // Tab→'plots', J→'jobs', I→'inventory', H→'tutorial', E (trong HOUSE_INTERACT_RADIUS)→'landlord', Esc→ đóng bảng đang mở hoặc mở 'pause'
  // Mở bảng thì nhả pointer lock; đóng bảng thì người chơi bấm vào khung game để khóa lại
  // JobBoard
  function listLandlordJobs(state: GameState): { plotId: number; task: Task; wage: number; secondsLeft: number }[]
    // secondsLeft = landlordJobTimeoutSec − jobAgeSec[task], sắp tăng dần
  // Tutorial
  function tutorialSections(): { id: 'controls'|'wages'|'prices'|'timing'|'roadmap'; title: string; rows: [string, string][] }[]
    // mọi số lấy từ CONFIG
  ```
- **Hud:** góc trái trên `<tên> · <xu> Xu`; tâm ngắm; khung thông tin ô đang nhắm (spec 6.4: số ô, chủ, giai đoạn, nước %, sức khỏe, việc cần làm + tiền công nếu là ô Địa chủ); thanh tiến trình; thanh 6 công cụ (phím, tên, cấp); gợi ý "Nhấn E để vào nhà Địa chủ" khi đứng gần; nút "?" mở hướng dẫn.
- **PlotBoard:** lưới 4×5 (spec 6.5), mỗi ô: số, chủ (Địa chủ / Bạn / Đang bán), giai đoạn, biểu tượng 💧 (nước < 30 ở giai đoạn cần nước) 🌿 🐛 🌾 (ripe). Bấm → `teleportTo(id)` và đóng bảng.
- **JobBoard:** bảng từ `listLandlordJobs`. Bấm một dòng → `teleportTo`.
- **LandlordHouse:** 5 thẻ. Bán lúa (ô nhập kg + "Bán hết"); Mua giống/phân (số lượng); Mua đất (danh sách ô `forSale` với giá); Nâng cấp công cụ (cấp hiện tại, giá cấp sau, hoặc "Tối đa"); Thuê NPC (khóa với chữ "Cần sở hữu 5 ô" khi chưa đủ; mở thì danh sách ô của người chơi, công tắc, lý do bị chặn nếu có). Mọi nút gọi `dispatch`.
- **Inventory:** giống, phân, lúa (kg), cấp công cụ, danh sách ô sở hữu.
- **Tutorial:** 5 thẻ từ `tutorialSections()`. Tự mở khi vào game nếu `!tutorialSeen`; đóng thì `dispatch({ type:'markTutorialSeen' })`.
- **PauseMenu:** Tiếp tục · Hướng dẫn · Lưu (toast "Đã lưu") · Về màn hình đầu (lưu rồi `exitToStart`).

- [ ] **Step 1: Viết test**
  ```ts
  // tutorial.test.ts
  it('bảng giá có giá đất 2.000, giống 30, phân 40, lúa 8', ...)   // tìm trong rows; định dạng số vi-VN
  it('bảng tiền công có đủ 10 việc với số khớp CONFIG.wages', ...)
  it('bảng thời gian có 180/300/300/240 giây', ...)
  // jobs.test.ts
  it('listLandlordJobs chỉ lấy ô Địa chủ, secondsLeft đúng, sắp tăng dần', ...)
  ```
- [ ] **Step 2: Chạy** → FAIL
- [ ] **Step 3: Viết code**
- [ ] **Step 4: Chạy `npm test`** → PASS
- [ ] **Step 5: `npm run dev`, chơi thử theo spec mục 6:** mọi phím mở đúng bảng; Tab bấm ô 17 → dịch chuyển tới ô 17; mua giống, mua đất khi đủ Xu (tạm sửa `xu` trong localStorage để thử), bán lúa, nâng cấp; thẻ Thuê NPC khóa khi có dưới 5 ô.
- [ ] **Step 6: Commit** `feat(client): HUD, boards, landlord house, tutorial and pause menu`

---

### Task 11: NPC làm thuê đi lại

**Files:**
- Create: `src/scene/Workers.tsx`
- Modify: `src/game/store.ts` (lưu hàng đợi `workerVisits`), `src/scene/World.tsx`

**Interfaces:**
- Consumes: sự kiện `landlordWorkerDid`, `npcDid` từ `advance()`
- Produces: `workerVisits: { id: number; plotId: number; startedAt: number }[]` trong store. Mỗi sự kiện trên thêm một lượt; lượt tự xóa sau 8 giây.
- Mỗi lượt vẽ một NPC (giống hình Địa chủ nhưng áo nâu, nón lá): đi từ `HOUSE_DOOR` tới `teleportPose(plotId)` trong 3 giây, đứng cúi người 2 giây, đi về 3 giây. Chỉ để nhìn, không ảnh hưởng luật chơi.

- [ ] **Step 1: Viết code**
- [ ] **Step 2: `npm run dev`:** để một việc Địa chủ quá 60 giây → thấy NPC đi ra ô, ô đổi giai đoạn; với ô mình bật NPC → NPC ra làm và Xu giảm đúng tiền công.
- [ ] **Step 3: Chạy `npm test`** → vẫn PASS
- [ ] **Step 4: Commit** `feat(client): animated worker NPCs`

---

### Task 12: Đăng lên GitHub Pages và kiểm tra cuối

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `README.md` (giới thiệu, link chơi, `npm install` / `npm run dev` / `npm test`, Node ≥ 20)

**Workflow:** chạy khi push lên `main`. Các bước: `actions/checkout@v4` → `actions/setup-node@v4` (node 20, cache npm) → `npm ci` → `npm test` → `npm run build` → `actions/upload-pages-artifact@v3` (path `packages/client/dist`) → `actions/deploy-pages@v4`. Quyền: `pages: write`, `id-token: write`.

- [ ] **Step 1: Chạy `npm run build`** → thư mục `packages/client/dist` được tạo, không lỗi TypeScript
- [ ] **Step 2: Chạy `npx vite preview` trong `packages/client`, mở link.** Chơi trọn checklist bên dưới.
- [ ] **Step 3: Đo khung hình** bằng tab Performance của Chrome khi đứng giữa cánh đồng nhìn toàn bộ 20 ô. Mục tiêu khoảng 60 khung hình/giây. Nếu thấp hơn thì giảm số cụm lúa mỗi ô từ 64 xuống 36 và ghi lại.
- [ ] **Step 4: Viết workflow và README, commit** `ci: deploy client to GitHub Pages`
- [ ] **Step 5: Báo người dùng** cần bật Settings → Pages → Source: "GitHub Actions" và push lên GitHub (chỉ push khi người dùng đồng ý).

**Checklist chơi tay (spec mục 1 và 6):**
- Đặt tên → hướng dẫn tự mở → đóng → F5 → "Chơi tiếp" không mở lại hướng dẫn.
- Làm thuê đủ các loại việc, thấy công cộng đúng bảng.
- Mua giống, phân, đất; tự làm một vụ trên ô mình; bán lúa 8 Xu/kg.
- Bỏ bê một ô (không tưới, không bón phân) → năng suất thấp hơn.
- Sở hữu 5 ô → thuê NPC → NPC làm và trừ công; hết Xu → thông báo một lần.
- Chuyển tab đi 1 phút rồi quay lại → lúa không lớn thêm trong thời gian đó.
- Tab/J/I/H/E/Esc và phím 1–6 hoạt động đúng.
