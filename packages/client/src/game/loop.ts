import { useEffect } from 'react'
import { CONFIG } from '@rice/core'
import { useGame } from './store'

const MAX_DT_SEC = 5

/** Cho thời gian game trôi mỗi giây; dừng khi tab ẩn; tự lưu định kỳ và khi đóng tab. */
export function useGameLoop(): void {
  useEffect(() => {
    let last = performance.now()
    let carry = 0
    let sinceSave = 0
    const save = (): void => { useGame.getState().saveNow() }

    const id = window.setInterval(() => {
      const now = performance.now()
      if (document.hidden) {
        last = now
        return
      }
      const dt = Math.min(MAX_DT_SEC, (now - last) / 1000) + carry
      last = now
      const whole = Math.floor(dt)
      carry = dt - whole
      if (whole <= 0) return
      useGame.getState().advance(whole)
      sinceSave += whole
      if (sinceSave >= CONFIG.autosaveIntervalSec) {
        sinceSave = 0
        save()
      }
    }, 1000)

    const onVisibility = (): void => {
      last = performance.now()
      if (document.hidden) save()
    }
    window.addEventListener('beforeunload', save)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('beforeunload', save)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
}
