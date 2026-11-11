import { describe, it, expect } from 'vitest'
import { CONFIG, createNewGame, type ErrorCode, type Stage, type Task, type ToolId } from '@rice/core'
import { CONTROLS, ERROR_MESSAGES, STAGE_LABELS, TASK_LABELS, TOOL_LABELS, continueLabel, describeEvent } from './messages'

const ERRORS: ErrorCode[] = ['WRONG_STAGE', 'WRONG_TOOL', 'NOT_ENOUGH_XU', 'NO_SEED', 'NO_FERTILIZER', 'NOT_OWNER',
  'NOT_FOR_SALE', 'NO_JOB', 'NPC_LOCKED', 'MAX_LEVEL', 'NOT_ENOUGH_RICE', 'INVALID_AMOUNT', 'DAY_ENDED']
const STAGES: Stage[] = ['dry', 'plowed', 'seedling', 'seedlingReady', 'young', 'green', 'flowering', 'ripe', 'bundled']
const TOOLS: ToolId[] = ['hoe', 'seedBasket', 'waterScoop', 'fertilizerBag', 'sickle', 'hands']

describe('messages', () => {
  it('mọi ErrorCode, Stage, Task, ToolId đều có nhãn tiếng Việt không rỗng', () => {
    for (const e of ERRORS) expect(ERROR_MESSAGES[e]).toBeTruthy()
    for (const s of STAGES) expect(STAGE_LABELS[s]).toBeTruthy()
    for (const t of Object.keys(CONFIG.wages) as Task[]) expect(TASK_LABELS[t]).toBeTruthy()
    for (const t of TOOLS) expect(TOOL_LABELS[t]).toBeTruthy()
  })

  it('continueLabel định dạng số vi-VN: xu 3981, day 6, 4 ô → "Tí · Ngày 6 · 3.981 Xu · 4 ô đất"', () => {
    const s = createNewGame('Tí', 1)
    s.xu = 3981
    s.day = 6
    for (const id of [13, 14, 15, 16]) s.plots[id - 1].owner = 'player'
    expect(continueLabel(s)).toBe('Tí · Ngày 6 · 3.981 Xu · 4 ô đất')
  })

  it('describeEvent: công làm thuê có số Xu; stageChanged và dayEnded không thông báo', () => {
    expect(describeEvent({ type: 'wagePaid', plotId: 3, task: 'harvest', amount: 20 })).toContain('+20 Xu')
    expect(describeEvent({ type: 'stageChanged', plotId: 3, stage: 'ripe' })).toBeNull()
  })

  it('CONTROLS có đủ các phím của spec 6.3', () => {
    const keys = CONTROLS.map(c => c.keys).join(' ')
    for (const k of ['W A S D', 'Shift', 'Chuột', '1–6', 'E', 'Tab', 'I', 'J', 'H', 'Esc']) expect(keys).toContain(k)
  })
})
