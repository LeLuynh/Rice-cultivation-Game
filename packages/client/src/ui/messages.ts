import { CONFIG, ownedPlotCount, type ErrorCode, type GameEvent, type GameState, type Stage, type Task, type ToolId } from '@rice/core'

export const formatNumber = (n: number): string => n.toLocaleString('vi-VN')
export const formatXu = (n: number): string => `${formatNumber(n)} Xu`

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  WRONG_STAGE: 'Ô này chưa tới giai đoạn làm việc đó',
  WRONG_TOOL: 'Cầm sai công cụ cho việc này',
  NOT_ENOUGH_XU: 'Không đủ Xu',
  NO_SEED: 'Hết giống – mua thêm ở nhà Địa chủ',
  NO_FERTILIZER: 'Hết phân – mua thêm ở nhà Địa chủ',
  NOT_OWNER: 'Ô này không phải của bạn',
  NOT_FOR_SALE: 'Ô này không bán',
  NO_JOB: 'Ô này đang không cần việc đó',
  NPC_LOCKED: `Cần sở hữu ${CONFIG.npcUnlockPlotCount} ô để thuê NPC`,
  MAX_LEVEL: 'Công cụ đã ở cấp tối đa',
  NOT_ENOUGH_RICE: 'Kho không đủ lúa',
  INVALID_AMOUNT: 'Số lượng phải là số nguyên lớn hơn 0',
  DAY_ENDED: 'Đã hết ngày – hãy đi ngủ',
}

export const STAGE_LABELS: Record<Stage, string> = {
  dry: 'Đất khô',
  plowed: 'Đất đã làm',
  seedling: 'Mạ non',
  seedlingReady: 'Mạ đủ lớn',
  young: 'Lúa non',
  green: 'Lúa xanh',
  flowering: 'Trổ bông',
  ripe: 'Chín vàng',
  bundled: 'Bó lúa',
}

export const TASK_LABELS: Record<Task, string> = {
  plow: 'Cày bừa',
  sow: 'Gieo mạ',
  transplant: 'Nhổ mạ và cấy',
  water: 'Tưới',
  drain: 'Tháo nước',
  fertilize: 'Bón phân',
  weed: 'Làm cỏ',
  pestControl: 'Bắt sâu',
  harvest: 'Gặt',
  thresh: 'Tuốt và phơi',
}

export const TOOL_LABELS: Record<ToolId, string> = {
  hoe: 'Cuốc',
  seedBasket: 'Rổ mạ',
  waterScoop: 'Gáo nước',
  fertilizerBag: 'Bao phân',
  sickle: 'Liềm',
  hands: 'Tay không',
}

/** Thứ tự công cụ theo phím 1–6. */
export const TOOL_ORDER: ToolId[] = ['hoe', 'seedBasket', 'waterScoop', 'fertilizerBag', 'sickle', 'hands']

export const CONTROLS: { keys: string; label: string }[] = [
  { keys: 'W A S D', label: 'Di chuyển' },
  { keys: 'Chuột', label: 'Nhìn xung quanh (bấm vào khung game để khóa chuột)' },
  { keys: 'Shift', label: 'Chạy nhanh' },
  { keys: '1–6', label: 'Chọn công cụ: cuốc, rổ mạ, gáo, phân, liềm, tay' },
  { keys: 'Giữ chuột trái', label: 'Làm việc trên ô đang nhìn' },
  { keys: 'E', label: 'Vào nhà Địa chủ: mua bán, mua đất, thuê NPC' },
  { keys: 'Tab', label: 'Bảng ô 1–20 – bấm để dịch chuyển' },
  { keys: 'J', label: 'Bảng việc làm thuê' },
  { keys: 'I', label: 'Kho' },
  { keys: 'H', label: 'Hướng dẫn đầy đủ: giá cả, tiền công, thời gian' },
  { keys: 'Esc', label: 'Tạm dừng và nhả chuột' },
]

export function continueLabel(s: GameState): string {
  return `${s.playerName} · Ngày ${s.day} · ${formatXu(s.xu)} · ${ownedPlotCount(s)} ô đất`
}

/** Câu thông báo ngắn cho sự kiện; null với sự kiện không cần thông báo. */
export function describeEvent(e: GameEvent): string | null {
  switch (e.type) {
    case 'wagePaid': return `+${e.amount} Xu – ${TASK_LABELS[e.task].toLowerCase()} ô ${e.plotId}`
    case 'riceHarvested': return e.toPlayer ? `Thu được ${formatNumber(e.kg)} kg lúa ở ô ${e.plotId}` : null
    case 'npcDid': return `NPC ${TASK_LABELS[e.task].toLowerCase()} ô ${e.plotId} (−${e.wage} Xu)`
    case 'npcBlocked': return `NPC dừng ở ô ${e.plotId}: ${ERROR_MESSAGES[e.reason]}`
    case 'weedsAppeared': return `Ô ${e.plotId} mọc cỏ!`
    case 'pestsAppeared': return `Ô ${e.plotId} có sâu!`
    case 'landlordWorkerDid':
    case 'stageChanged':
    case 'dayEnded':
      return null
  }
}
