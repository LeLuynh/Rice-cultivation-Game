export const NAME_MIN = 2
export const NAME_MAX = 16

/** Tên người chơi: bỏ khoảng trắng hai đầu, 2–16 ký tự (spec 6.1). */
export function validatePlayerName(input: string):
  { ok: true; name: string } | { ok: false; reason: 'tooShort' | 'tooLong' } {
  const name = input.trim()
  const length = [...name].length
  if (length < NAME_MIN) return { ok: false, reason: 'tooShort' }
  if (length > NAME_MAX) return { ok: false, reason: 'tooLong' }
  return { ok: true, name }
}
