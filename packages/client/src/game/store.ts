import { create } from 'zustand'
import { applyAction, createNewGame, tick, type Action, type GameEvent, type GameState, type ToolId } from '@rice/core'
import { browserStorage, createSaveStore } from './save'
import { loadQuality, saveQuality, type Quality } from './quality'

export type { Quality }
import { ERROR_MESSAGES, describeEvent } from '../ui/messages'

export type Panel = null | 'plots' | 'jobs' | 'inventory' | 'landlord' | 'tutorial' | 'pause' | 'daySummary'
export interface Toast { id: number; text: string; kind: 'info' | 'error' }
/** Một lượt NPC đi ra ô làm việc – chỉ để nhìn. */
export interface WorkerVisit { id: number; plotId: number; startedAt: number }
export const WORKER_VISIT_MS = 8000

export interface GameStore {
  screen: 'start' | 'playing'
  game: GameState | null
  panel: Panel
  toasts: Toast[]
  selectedTool: ToolId
  teleportTarget: number | null
  targetPlotId: number | null
  actionProgress: number | null
  nearHouse: boolean
  workerVisits: WorkerVisit[]
  /** Lần lưu gần nhất thất bại (trình duyệt chặn bộ nhớ hoặc đầy). */
  saveFailed: boolean
  /** Chất lượng đồ họa (spec 11). */
  quality: Quality
  setQuality(q: Quality): void
  startNew(name: string): void
  continueGame(): void
  exitToStart(): void
  dispatch(a: Action): boolean
  advance(dtSec: number): void
  setPanel(p: Panel): void
  selectTool(t: ToolId): void
  teleportTo(plotId: number): void
  clearTeleport(): void
  setTarget(id: number | null): void
  setActionProgress(p: number | null): void
  setNearHouse(v: boolean): void
  pushToast(text: string, kind?: 'info' | 'error'): void
  saveNow(): boolean
}

export const saveStore = createSaveStore(browserStorage())
const TOAST_MS = 4000
let nextToastId = 1
let nextVisitId = 1

/** Panel bắt buộc khi đang có tổng kết ngày. */
const panelFor = (game: GameState, wanted: Panel): Panel => (game.daySummary ? 'daySummary' : wanted)

export const SAVE_FAILED_TEXT = 'Không lưu được tiến trình – trình duyệt đang chặn bộ nhớ. Tiến trình sẽ mất khi đóng trang.'
const TRANSIENT = { workerVisits: [], targetPlotId: null, actionProgress: null, nearHouse: false, teleportTarget: null }

export const useGame = create<GameStore>((set, get) => {
  /** Lưu và cảnh báo một lần khi bắt đầu thất bại (spec 8). */
  const persist = (game: GameState): boolean => {
    const ok = saveStore.save(game)
    if (!ok && !get().saveFailed) get().pushToast(SAVE_FAILED_TEXT, 'error')
    if (ok !== !get().saveFailed) set({ saveFailed: !ok })
    return ok
  }
  const toastEvents = (events: GameEvent[]): void => {
    for (const e of events) {
      const text = describeEvent(e)
      if (text) get().pushToast(text)
    }
  }

  return {
    screen: 'start',
    game: null,
    panel: null,
    toasts: [],
    selectedTool: 'hoe',
    teleportTarget: null,
    targetPlotId: null,
    actionProgress: null,
    nearHouse: false,
    workerVisits: [],
    quality: loadQuality(browserStorage()),
    setQuality(q) { saveQuality(browserStorage(), q); set({ quality: q }) },
    saveFailed: false,

    startNew(name) {
      saveStore.clear()
      const game = createNewGame(name, Date.now() >>> 0)
      set({ ...TRANSIENT, screen: 'playing', game, panel: null, toasts: [], selectedTool: 'hoe', saveFailed: false })
      persist(game)
    },

    continueGame() {
      const loaded = saveStore.load()
      if (loaded.status !== 'ok') return
      set({ ...TRANSIENT, screen: 'playing', game: loaded.state, panel: panelFor(loaded.state, null), toasts: [] })
    },

    exitToStart() {
      get().saveNow()
      if (document.pointerLockElement) document.exitPointerLock()
      set({ ...TRANSIENT, screen: 'start', game: null, panel: null })
    },

    dispatch(action) {
      const { game } = get()
      if (!game) return false
      const result = applyAction(game, action)
      if (!result.ok) {
        get().pushToast(ERROR_MESSAGES[result.error], 'error')
        return false
      }
      set({ game: result.state })
      toastEvents(result.events)
      if (action.type !== 'performTask') persist(result.state)
      return true
    },

    advance(dtSec) {
      const { game } = get()
      if (!game || game.daySummary) return
      const result = tick(game, dtSec)
      const now = performance.now()
      const visits = get().workerVisits.filter(v => now - v.startedAt < WORKER_VISIT_MS)
      for (const e of result.events) {
        if (e.type === 'landlordWorkerDid' || e.type === 'npcDid') visits.push({ id: nextVisitId++, plotId: e.plotId, startedAt: now })
      }
      set({ game: result.state, workerVisits: visits })
      toastEvents(result.events)
      if (result.events.some(e => e.type === 'dayEnded')) {
        set({ panel: 'daySummary' })
        persist(result.state)
      }
    },

    setPanel(p) {
      const { game, panel } = get()
      // rời bảng hướng dẫn bằng bất kỳ cách nào (nút, Esc, H) đều tính là đã xem
      if (panel === 'tutorial' && p !== 'tutorial' && game && !game.tutorialSeen) get().dispatch({ type: 'markTutorialSeen' })
      const current = get().game
      set({ panel: current ? panelFor(current, p) : p })
    },

    selectTool(t) { set({ selectedTool: t }) },
    teleportTo(plotId) { set({ teleportTarget: plotId }) },
    clearTeleport() { set({ teleportTarget: null }) },
    setTarget(id) { if (get().targetPlotId !== id) set({ targetPlotId: id }) },
    setActionProgress(p) { if (get().actionProgress !== p) set({ actionProgress: p }) },
    setNearHouse(v) { if (get().nearHouse !== v) set({ nearHouse: v }) },

    pushToast(text, kind = 'info') {
      const id = nextToastId++
      set(s => ({ toasts: [...s.toasts, { id, text, kind }].slice(-5) }))
      setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), TOAST_MS)
    },

    saveNow() {
      const { game } = get()
      return game ? persist(game) : false
    },
  }
})

// Mọi bảng (kể cả tự mở như tổng kết ngày) đều cần con trỏ chuột để bấm: mở bảng là nhả khóa chuột.
useGame.subscribe((s, prev) => {
  if (s.panel !== null && prev.panel === null && typeof document !== 'undefined' && document.pointerLockElement) {
    document.exitPointerLock()
  }
})
