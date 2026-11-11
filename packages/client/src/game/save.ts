import { CONFIG, createNewGame, freshPlot, type GameState } from '@rice/core'

export const SAVE_KEY = 'rice-game-save'

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
export type LoadResult = { status: 'none' } | { status: 'ok'; state: GameState } | { status: 'corrupt' }

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

const STAGES = new Set(['dry', 'plowed', 'seedling', 'seedlingReady', 'young', 'green', 'flowering', 'ripe', 'bundled'])
const OWNERS = new Set(['landlord', 'player', 'forSale'])
const TEMPLATE_GAME = createNewGame('x', 1)
const TEMPLATE_PLOT = freshPlot(1, 'landlord')

/** Mọi khóa của mẫu đều có trong `v` với cùng kiểu số. */
const numbersLike = (v: unknown, template: object): boolean =>
  isObject(v) && Object.keys(template).every(k => typeof v[k] === 'number' && Number.isFinite(v[k]))

function isPlot(v: unknown): boolean {
  if (!isObject(v) || !STAGES.has(v.stage as string) || !OWNERS.has(v.owner as string)) return false
  if (!isObject(v.jobAgeSec) || !(v.npcBlocked === null || typeof v.npcBlocked === 'string')) return false
  return Object.entries(TEMPLATE_PLOT).every(([k, t]) =>
    typeof t === 'number' || typeof t === 'boolean' ? typeof v[k] === typeof t : true)
}

/** Chuyển bản lưu về GameState hiện tại; trả null nếu thiếu trường hoặc phiên bản lạ. */
export function migrate(raw: unknown): GameState | null {
  if (!isObject(raw) || raw.version !== 1) return null
  const numbers = ['xu', 'rngState', 'timeSec', 'day', 'dayElapsedSec']
  if (typeof raw.playerName !== 'string' || typeof raw.tutorialSeen !== 'boolean') return null
  if (numbers.some(k => typeof raw[k] !== 'number')) return null
  if (!numbersLike(raw.inventory, TEMPLATE_GAME.inventory) || !numbersLike(raw.toolLevels, TEMPLATE_GAME.toolLevels)) return null
  if (!numbersLike(raw.dayStats, TEMPLATE_GAME.dayStats)) return null
  if (raw.daySummary !== null && !numbersLike(raw.daySummary, { ...TEMPLATE_GAME.dayStats, day: 0, endXu: 0, netXu: 0 })) return null
  if (!Array.isArray(raw.plots) || raw.plots.length !== CONFIG.plotCount || !raw.plots.every(isPlot)) return null
  return raw as unknown as GameState
}

export function createSaveStore(storage: StorageLike | null) {
  return {
    load(): LoadResult {
      let text: string | null
      try {
        text = storage ? storage.getItem(SAVE_KEY) : null
      } catch {
        return { status: 'none' }
      }
      if (text === null) return { status: 'none' }
      try {
        const state = migrate(JSON.parse(text))
        return state ? { status: 'ok', state } : { status: 'corrupt' }
      } catch {
        return { status: 'corrupt' }
      }
    },
    save(state: GameState): boolean {
      if (!storage) return false
      try {
        storage.setItem(SAVE_KEY, JSON.stringify(state))
        return true
      } catch {
        return false
      }
    },
    clear(): void {
      try {
        storage?.removeItem(SAVE_KEY)
      } catch {
        // không xóa được thì thôi; lần lưu sau sẽ ghi đè
      }
    },
  }
}

/** localStorage của trình duyệt, hoặc null nếu bị chặn. */
export function browserStorage(): StorageLike | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}
