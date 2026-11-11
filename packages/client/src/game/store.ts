import { create } from 'zustand'
import { applyAction, createNewGame, tick, type Action, type GameEvent, type GameState, type ToolId } from '@rice/core'
import { browserStorage, createSaveStore } from './save'
import { ERROR_MESSAGES, describeEvent } from '../ui/messages'

export type Panel = null | 'plots' | 'jobs' | 'inventory' | 'landlord' | 'tutorial' | 'pause' | 'daySummary'
export interface Toast { id: number; text: string; kind: 'info' | 'error' }

export interface GameStore {
  screen: 'start' | 'playing'
  game: GameState | null
  panel: Panel
  toasts: Toast[]
  selectedTool: ToolId
  teleportTarget: number | null
  targetPlotId: number | null
  actionProgress: number | null
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
  pushToast(text: string, kind?: 'info' | 'error'): void
  saveNow(): boolean
}

export const saveStore = createSaveStore(browserStorage())
const TOAST_MS = 4000
let nextToastId = 1

/** Panel bắt buộc khi đang có tổng kết ngày. */
const panelFor = (game: GameState, wanted: Panel): Panel => (game.daySummary ? 'daySummary' : wanted)

export const useGame = create<GameStore>((set, get) => {
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

    startNew(name) {
      saveStore.clear()
      const game = createNewGame(name, Date.now() >>> 0)
      saveStore.save(game)
      set({ screen: 'playing', game, panel: null, toasts: [], selectedTool: 'hoe' })
    },

    continueGame() {
      const loaded = saveStore.load()
      if (loaded.status !== 'ok') return
      set({ screen: 'playing', game: loaded.state, panel: panelFor(loaded.state, null), toasts: [] })
    },

    exitToStart() {
      get().saveNow()
      set({ screen: 'start', game: null, panel: null })
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
      if (action.type !== 'performTask') saveStore.save(result.state)
      return true
    },

    advance(dtSec) {
      const { game } = get()
      if (!game || game.daySummary) return
      const result = tick(game, dtSec)
      set({ game: result.state })
      toastEvents(result.events)
      if (result.events.some(e => e.type === 'dayEnded')) {
        set({ panel: 'daySummary' })
        saveStore.save(result.state)
      }
    },

    setPanel(p) {
      const { game } = get()
      set({ panel: game ? panelFor(game, p) : p })
    },

    selectTool(t) { set({ selectedTool: t }) },
    teleportTo(plotId) { set({ teleportTarget: plotId }) },
    clearTeleport() { set({ teleportTarget: null }) },
    setTarget(id) { if (get().targetPlotId !== id) set({ targetPlotId: id }) },
    setActionProgress(p) { if (get().actionProgress !== p) set({ actionProgress: p }) },

    pushToast(text, kind = 'info') {
      const id = nextToastId++
      set(s => ({ toasts: [...s.toasts, { id, text, kind }].slice(-5) }))
      setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), TOAST_MS)
    },

    saveNow() {
      const { game } = get()
      return game ? saveStore.save(game) : false
    },
  }
})
