import { CONFIG, type Task } from '@rice/core'
import { CONTROLS, TASK_LABELS, TOOL_LABELS, formatNumber, formatXu } from './messages'

export type TutorialSectionId = 'controls' | 'wages' | 'prices' | 'timing' | 'roadmap'
export interface TutorialSection { id: TutorialSectionId; title: string; rows: [string, string][] }

const minutes = (sec: number): string => `${sec} giây`

/** Nội dung 5 thẻ hướng dẫn; mọi con số lấy từ CONFIG (spec 6.2). */
export function tutorialSections(): TutorialSection[] {
  const c = CONFIG
  const toolOf = (t: Task): string => TOOL_LABELS[c.tasks[t].tool].toLowerCase()
  return [
    { id: 'controls', title: 'Điều khiển', rows: CONTROLS.map(k => [k.keys, k.label]) },
    {
      id: 'wages',
      title: 'Tiền công',
      rows: (Object.keys(c.wages) as Task[]).map(t => [`${TASK_LABELS[t]} (${toolOf(t)})`, formatXu(c.wages[t])]),
    },
    {
      id: 'prices',
      title: 'Giá cả',
      rows: [
        ['Một ô đất (ô 13–20)', formatXu(c.landPrice)],
        ['Giống (1 bao cho 1 ô)', formatXu(c.seedPrice)],
        ['Phân (1 bao cho 1 ô)', formatXu(c.fertilizerPrice)],
        ['Địa chủ mua lúa (không thuế)', `${formatNumber(c.ricePricePerKg)} Xu/kg`],
        ['Nâng công cụ lên cấp 2 (nhanh hơn 30%)', formatXu(c.toolUpgradeCost[2])],
        ['Nâng công cụ lên cấp 3 (nhanh hơn 60%)', formatXu(c.toolUpgradeCost[3])],
        ['Thuê NPC', `Mở khi có ${c.npcUnlockPlotCount} ô; trả công theo bảng tiền công`],
      ],
    },
    {
      id: 'timing',
      title: 'Thời gian & chăm sóc',
      rows: [
        ['Một ngày', `${c.day.startHour}:00 – ${c.day.endHour}:00 (${minutes(c.day.lengthSec)} thật)`],
        ['Mạ non → mạ đủ lớn', minutes(c.stageDurationSec.seedling)],
        ['Lúa non → lúa xanh', minutes(c.stageDurationSec.young)],
        ['Lúa xanh → trổ bông', minutes(c.stageDurationSec.green)],
        ['Trổ bông → chín vàng', minutes(c.stageDurationSec.flowering)],
        ['Nước', `Giảm ${c.water.drainPer10s}% mỗi 10 giây; dưới ${c.water.threshold}% thì lúa yếu đi`],
        ['Cỏ / sâu', `Mỗi ${c.pests.checkIntervalSec} giây có ${c.pests.weedChance * 100}% mọc cỏ, ${c.pests.pestChance * 100}% có sâu`],
        ['Bón phân', `Làm ở lúa non hoặc lúa xanh; quên thì −${c.penalty.noFertilizer} sức khỏe`],
        ['Tháo nước', `Làm khi trổ bông; quên thì −${c.penalty.noDrain} sức khỏe`],
        ['Chín quá lâu', `Sau ${minutes(c.penalty.overripeAfterSec)} mất ${c.penalty.overripeKgPer10s} kg mỗi 10 giây`],
        ['Năng suất', `${c.yieldKg.min}–${c.yieldKg.max} kg/ô tùy sức khỏe`],
      ],
    },
    {
      id: 'roadmap',
      title: 'Lộ trình',
      rows: [
        ['1. Làm thuê', 'Làm việc trên ruộng Địa chủ (ô 1–12), nhận công ngay. Để quá 60 giây người làm khác sẽ làm thay.'],
        ['2. Mua đất', `Đủ ${formatXu(c.landPrice)} thì mua một ô 13–20 ở nhà Địa chủ, mua giống và phân để tự làm.`],
        ['3. Bán lúa', 'Tuốt xong, lúa vào kho. Bán cho Địa chủ, không mất thuế.'],
        ['4. Lên Địa chủ', `Có ${c.npcUnlockPlotCount} ô thì thuê NPC làm hộ, trả công theo từng việc.`],
        ['Hết ngày', '22:00 xem tổng kết ngày rồi đi ngủ; đêm lúa không lớn.'],
      ],
    },
  ]
}
