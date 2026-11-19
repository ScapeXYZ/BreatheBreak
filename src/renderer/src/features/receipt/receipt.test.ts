import { describe, expect, it } from 'vitest'
import { advanceReceiptTimeline, baselineCompletionReason, calculateReceipt, RECEIPT_BASELINE_MAX_SECONDS, RECEIPT_BASELINE_TARGET_READINGS, RECEIPT_DISCLOSURE, RECEIPT_GUIDED_SECONDS, RECEIPT_INSUFFICIENT_COPY, type ReceiptReading } from './receipt'

const reading = (value: number, phase: 'baseline' | 'guided', stable = true, gated = true): ReceiptReading => ({ value, phase, stable, gated })

describe('Reset Receipt calculation (simulation-only fixtures)', () => {
  it('uses the baseline median and the median of the final three guided readings', () => {
    expect(calculateReceipt([reading(10, 'baseline'), reading(30, 'baseline'), reading(20, 'baseline'), reading(11, 'guided'), reading(12, 'guided'), reading(13, 'guided'), reading(14, 'guided')])).toEqual({ before: 20, after: 13, change: -7, beforeCount: 3, afterCount: 4, sufficient: true })
  })

  it('handles ties and even baseline counts deterministically', () => {
    expect(calculateReceipt([reading(8, 'baseline'), reading(10, 'baseline'), reading(10, 'baseline'), reading(12, 'baseline'), reading(9, 'guided'), reading(9, 'guided'), reading(11, 'guided')])).toEqual({ before: 10, after: 9, change: -1, beforeCount: 4, afterCount: 3, sufficient: true })
  })

  it('excludes unstable, ungated, non-finite, and out-of-range values', () => {
    const result = calculateReceipt([reading(3, 'baseline'), reading(46, 'baseline'), reading(Number.NaN, 'baseline'), reading(8, 'baseline', false), reading(9, 'baseline', true, false), reading(10, 'baseline'), reading(11, 'baseline'), reading(12, 'baseline'), reading(13, 'guided'), reading(14, 'guided'), reading(15, 'guided')])
    expect(result).toEqual({ before: 11, after: 14, change: 3, beforeCount: 3, afterCount: 3, sufficient: true })
  })

  it.each([
    ['early SDK stop', [reading(10, 'baseline'), reading(11, 'baseline')]],
    ['baseline readings only', [reading(10, 'baseline'), reading(11, 'baseline'), reading(12, 'baseline')]],
    ['guided readings only', [reading(10, 'guided'), reading(11, 'guided'), reading(12, 'guided')]]
  ])('returns no change for %s', (_case, readings) => {
    const result = calculateReceipt(readings)
    expect(result.sufficient).toBe(false)
    expect(result).not.toHaveProperty('change')
  })

  it('is eligible with two actual accepted readings in each phase',()=>{
    expect(calculateReceipt([reading(10,'baseline'),reading(12,'baseline'),reading(8,'guided'),reading(10,'guided')])).toEqual({before:11,after:9,change:-2,beforeCount:2,afterCount:2,sufficient:true})
    expect(calculateReceipt([reading(10,'baseline'),reading(8,'guided'),reading(10,'guided')])).toEqual({before:undefined,after:9,beforeCount:1,afterCount:2,sufficient:false})
  })

  it('keeps the required copy and 45-second guide duration exact', () => {
    expect(RECEIPT_GUIDED_SECONDS).toBe(45)
    expect(RECEIPT_INSUFFICIENT_COPY).toBe('Not enough stable readings for a receipt')
    expect(RECEIPT_DISCLOSURE).toBe('Measured by SmartSpectra. Not a score. Not medical.')
  })
  it('completes baseline at three readings or the 45-second cap', () => {
    expect(RECEIPT_BASELINE_TARGET_READINGS).toBe(3)
    expect(RECEIPT_BASELINE_MAX_SECONDS).toBe(45)
    expect(baselineCompletionReason(3, 2)).toBe('count')
    expect(baselineCompletionReason(1, 45)).toBe('cap')
    expect(baselineCompletionReason(2, 44.999)).toBeUndefined()
  })
})

describe('Reset Receipt timeline (simulation-only transitions)', () => {
  it('requires baseline before the guided phase and completes only after pacer end', () => {
    let phase = advanceReceiptTimeline('idle', 'pacer-start')
    expect(phase).toBe('idle')
    phase = advanceReceiptTimeline(phase, 'session-start')
    expect(phase).toBe('baseline')
    phase = advanceReceiptTimeline(phase, 'pacer-start')
    expect(phase).toBe('guided')
    phase = advanceReceiptTimeline(phase, 'pacer-end')
    expect(phase).toBe('complete')
    expect(advanceReceiptTimeline(phase, 'session-end')).toBe('idle')
  })
})
