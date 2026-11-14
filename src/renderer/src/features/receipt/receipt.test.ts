import { describe, expect, it } from 'vitest'
import { advanceReceiptTimeline, calculateReceipt, RECEIPT_DISCLOSURE, RECEIPT_GUIDED_SECONDS, RECEIPT_INSUFFICIENT_COPY, type ReceiptReading } from './receipt'

const reading = (value: number, phase: 'baseline' | 'guided', stable = true, gated = true): ReceiptReading => ({ value, phase, stable, gated })

describe('Reset Receipt calculation (simulation-only fixtures)', () => {
  it('uses the baseline median and the median of the final three guided readings', () => {
    expect(calculateReceipt([reading(10, 'baseline'), reading(30, 'baseline'), reading(20, 'baseline'), reading(11, 'guided'), reading(12, 'guided'), reading(13, 'guided'), reading(14, 'guided')])).toEqual({ before: 20, after: 13, change: -7, sufficient: true })
  })

  it('handles ties and even baseline counts deterministically', () => {
    expect(calculateReceipt([reading(8, 'baseline'), reading(10, 'baseline'), reading(10, 'baseline'), reading(12, 'baseline'), reading(9, 'guided'), reading(9, 'guided'), reading(11, 'guided')])).toEqual({ before: 10, after: 9, change: -1, sufficient: true })
  })

  it('excludes unstable, ungated, non-finite, and out-of-range values', () => {
    const result = calculateReceipt([reading(3, 'baseline'), reading(46, 'baseline'), reading(Number.NaN, 'baseline'), reading(8, 'baseline', false), reading(9, 'baseline', true, false), reading(10, 'baseline'), reading(11, 'baseline'), reading(12, 'baseline'), reading(13, 'guided'), reading(14, 'guided'), reading(15, 'guided')])
    expect(result).toEqual({ before: 11, after: 14, change: 3, sufficient: true })
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

  it('keeps the required copy and 45-second guide duration exact', () => {
    expect(RECEIPT_GUIDED_SECONDS).toBe(45)
    expect(RECEIPT_INSUFFICIENT_COPY).toBe('Not enough stable readings for a receipt')
    expect(RECEIPT_DISCLOSURE).toBe('Measured by SmartSpectra. Not a score. Not medical.')
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
