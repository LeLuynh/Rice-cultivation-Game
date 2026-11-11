import { CONFIG, type GameState } from '@rice/core'

export const SAVE_KEY = 'rice-game-save'

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
export type LoadResult = { status: 'none' } | { status: 'ok'; state: GameState } | { status: 'corrupt' }

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Chuyển bản lưu về GameState hiện tại; trả null nếu thiếu trường hoặc phiên bản lạ. */
export function migrate(raw: unknown): GameState | null {
  if (!isObject(raw) || raw.version !== 1) return null
  const numbers = ['xu', 'rngState', 'timeSec', 'day', 'dayElapsedSec']
  if (typeof raw.playerName !== 'string' || typeof raw.tutorialSeen !== 'boolean') return null
  if (numbers.some(k => typeof raw[k] !== 'number')) return null
  if (!isObject(raw.inventory) || !isObject(raw.toolLevels) || !isObject(raw.dayStats)) return null
  if (raw.daySummary !== null && !isObject(raw.daySummary)) return null
  if (!Array.isArray(raw.plots) || raw.plots.length !== CONFIG.plotCount || !raw.plots.every(isObject)) return null
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
