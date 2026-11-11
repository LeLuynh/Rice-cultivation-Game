import { describe, it, expect } from 'vitest'
import { validatePlayerName } from './name'

describe('validatePlayerName', () => {
  it.each([['  Tí  ', 'Tí'], ['Nguyễn Văn A', 'Nguyễn Văn A']])('nhận %s', (input, name) => {
    expect(validatePlayerName(input)).toEqual({ ok: true, name })
  })
  it.each(['', '   ', 'A'])('quá ngắn: "%s"', input => {
    expect(validatePlayerName(input)).toEqual({ ok: false, reason: 'tooShort' })
  })
  it('16 ký tự được nhận, 17 ký tự → tooLong', () => {
    expect(validatePlayerName('a'.repeat(16)).ok).toBe(true)
    expect(validatePlayerName('a'.repeat(17))).toEqual({ ok: false, reason: 'tooLong' })
  })
})
