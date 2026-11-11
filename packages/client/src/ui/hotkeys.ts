import { useEffect } from 'react'
import { useGame, type Panel } from '../game/store'

const KEY_PANELS: Record<string, Exclude<Panel, null>> = {
  Tab: 'plots',
  KeyJ: 'jobs',
  KeyI: 'inventory',
  KeyH: 'tutorial',
}

/** Phím tắt mở/đóng bảng (spec 6.3). Mở bảng thì nhả khóa chuột. */
export function useHotkeys(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.repeat) return
      const typing = e.target instanceof HTMLInputElement && (e.target.type === 'text' || e.target.type === 'number')
      if (typing && e.code !== 'Escape') return
      const { panel, setPanel, nearHouse } = useGame.getState()
      let next: Panel | undefined
      if (e.code === 'Escape') next = panel === null ? 'pause' : null
      else if (KEY_PANELS[e.code]) next = panel === KEY_PANELS[e.code] ? null : KEY_PANELS[e.code]
      else if (e.code === 'KeyE' && (panel === 'landlord' || (panel === null && nearHouse))) {
        next = panel === 'landlord' ? null : 'landlord'
      }
      if (next === undefined) return
      e.preventDefault()
      setPanel(next)
      if (useGame.getState().panel !== null && document.pointerLockElement) document.exitPointerLock()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
