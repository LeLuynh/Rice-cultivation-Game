import { describe, it, expect } from 'vitest'
import { createNewGame } from '@rice/core'
import { createSaveStore, SAVE_KEY, type StorageLike } from './save'

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: k => data.get(k) ?? null,
    setItem: (k, v) => { data.set(k, v) },
    removeItem: k => { data.delete(k) },
  }
}
const throwing: StorageLike = {
  getItem: () => { throw new Error('blocked') },
  setItem: () => { throw new Error('blocked') },
  removeItem: () => { throw new Error('blocked') },
}

describe('createSaveStore', () => {
  it('khóa lưu là rice-game-save', () => expect(SAVE_KEY).toBe('rice-game-save'))

  it('lưu rồi tải ra đúng state', () => {
    const store = createSaveStore(memoryStorage())
    const s = createNewGame('Tí', 3)
    expect(store.save(s)).toBe(true)
    expect(store.load()).toEqual({ status: 'ok', state: s })
  })

  it('chưa có → none', () => {
    expect(createSaveStore(memoryStorage()).load()).toEqual({ status: 'none' })
  })

  it.each(['{bad json', '{"version":99}', '{"version":1}', 'null', '[]'])('hỏng → corrupt: %s', raw => {
    const storage = memoryStorage()
    storage.data.set(SAVE_KEY, raw)
    expect(createSaveStore(storage).load()).toEqual({ status: 'corrupt' })
  })

  it('thiếu trường plots → corrupt', () => {
    const storage = memoryStorage()
    const { plots: _plots, ...rest } = createNewGame('Tí', 3)
    storage.data.set(SAVE_KEY, JSON.stringify(rest))
    expect(createSaveStore(storage).load()).toEqual({ status: 'corrupt' })
  })

  it('storage ném lỗi → save trả false, load none, không ném', () => {
    const store = createSaveStore(throwing)
    expect(store.save(createNewGame('Tí', 3))).toBe(false)
    expect(store.load()).toEqual({ status: 'none' })
    expect(() => store.clear()).not.toThrow()
  })

  it('storage null → load none, save false', () => {
    const store = createSaveStore(null)
    expect(store.load()).toEqual({ status: 'none' })
    expect(store.save(createNewGame('Tí', 3))).toBe(false)
  })

  it('clear xóa bản lưu', () => {
    const store = createSaveStore(memoryStorage())
    store.save(createNewGame('Tí', 3))
    store.clear()
    expect(store.load()).toEqual({ status: 'none' })
  })
})
