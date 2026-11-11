import { describe, expect, it } from 'vitest'
import { estimateBaseline, median, usableBreathingRate, WarmupGate } from './gating'

describe('usableBreathingRate', () => {
  it('blocks warm-up and unstable values', () => {
    expect(usableBreathingRate({ timestampMs: 1, quality: { kind: 'warming' }, breathingRate: { value: 40, confidence: 1, stable: true } })).toBeUndefined()
    expect(usableBreathingRate({ timestampMs: 1, quality: { kind: 'ok' }, breathingRate: { value: 40, confidence: 1, stable: false } })).toBeUndefined()
  })
  it('passes a stable source-provided value', () => {
    expect(usableBreathingRate({ timestampMs: 1, quality: { kind: 'ok' }, breathingRate: { value: 12, confidence: 0.8, stable: true } })).toBe(12)
  })
  it('rejects rates below 4 and above 45 breaths per minute', () => {
    const sample = (value: number) => ({ timestampMs: 1, quality: { kind: 'ok' as const }, breathingRate: { value, confidence: 80, stable: true } })
    expect(usableBreathingRate(sample(3.9))).toBeUndefined()
    expect(usableBreathingRate(sample(45.1))).toBeUndefined()
    expect(usableBreathingRate(sample(4))).toBe(4)
    expect(usableBreathingRate(sample(45))).toBe(45)
  })
  it('requires positive confidence and good quality', () => {
    expect(usableBreathingRate({ timestampMs: 1, quality: { kind: 'poor' }, breathingRate: { value: 12, confidence: 80, stable: true } })).toBeUndefined()
    expect(usableBreathingRate({ timestampMs: 1, quality: { kind: 'ok' }, breathingRate: { value: 12, confidence: 0, stable: true } })).toBeUndefined()
  })
})

describe('warm-up and baseline', () => {
  it('opens the warm-up gate only after its configured duration', () => {
    const gate = new WarmupGate(8_000, 1_000)
    expect(gate.isReady(8_999)).toBe(false)
    expect(gate.isReady(9_000)).toBe(true)
  })
  it('computes median for odd and even samples without mutating input', () => {
    const values = [9, 1, 5, 3]
    expect(median(values)).toBe(4)
    expect(median([7, 2, 4])).toBe(4)
    expect(values).toEqual([9, 1, 5, 3])
  })
  it('estimates a robust median and median absolute deviation', () => {
    expect(estimateBaseline([10, 11, 12, 100])).toEqual({ median: 11.5, mad: 1 })
  })
  it('returns no baseline for an empty sample', () => { expect(estimateBaseline([])).toBeUndefined() })
})
