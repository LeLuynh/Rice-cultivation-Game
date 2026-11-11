import type { DaySummary } from '@rice/core'
import { formatNumber, formatXu } from './messages'

export interface SummaryRow { label: string; value: string; tone: 'plus' | 'minus' | 'neutral' }

const MINUS = '−'
const plus = (n: number): string => `+${formatXu(n)}`
const minus = (n: number): string => `${MINUS}${formatXu(n)}`
const signed = (n: number): string => (n < 0 ? minus(-n) : plus(n))

/** Các dòng của bảng tổng kết ngày (spec 4.9). */
export function summaryRows(s: DaySummary): SummaryRow[] {
  return [
    { label: 'Việc làm thuê đã làm', value: `${formatNumber(s.landlordTasksDone)} việc`, tone: 'neutral' },
    { label: 'Tiền công nhận được', value: plus(s.wagesEarned), tone: 'plus' },
    { label: 'Lúa thu hoạch', value: `${formatNumber(s.riceHarvestedKg)} kg`, tone: 'neutral' },
    { label: 'Tiền bán lúa', value: plus(s.riceSalesXu), tone: 'plus' },
    { label: 'Mua giống / phân', value: minus(s.suppliesSpentXu), tone: 'minus' },
    { label: 'Mua đất / nâng cấp', value: minus(s.landAndUpgradeSpentXu), tone: 'minus' },
    { label: 'Trả công NPC', value: minus(s.npcWagesPaidXu), tone: 'minus' },
    { label: 'Lãi/lỗ trong ngày', value: signed(s.netXu), tone: s.netXu < 0 ? 'minus' : 'plus' },
    { label: 'Xu hiện có', value: formatXu(s.endXu), tone: 'neutral' },
  ]
}
