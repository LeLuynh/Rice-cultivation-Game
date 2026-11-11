import { describe, it, expect } from 'vitest'
import { nextRandom } from './rng'

function sequence(seed: number, n: number): number[] {
  const out: number[] = []
  let state = seed
  for (let i = 0; i < n; i++) {
    const [v, next] = nextRandom(state)
    out.push(v)
    state = next
  }
  return out
}

describe('nextRandom', () => {
  it('cùng seed cùng dãy', () => {
    expect(sequence(42, 5)).toEqual(sequence(42, 5))
  })
  it('seed khác cho dãy khác', () => {
    expect(sequence(42, 5)).not.toEqual(sequence(43, 5))
  })
  it('giá trị trong [0,1)', () => {
    for (const v of sequence(1, 1000)) {
      expect(v >= 0 && v < 1).toBe(true)
    }
  })
})
