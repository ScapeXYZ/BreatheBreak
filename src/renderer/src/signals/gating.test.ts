import { describe, expect, it } from 'vitest'
import { breathingRateGate, BREATHING_RATE_MIN_CONFIDENCE, estimateBaseline, median, UniqueRateGateCounter, usableBreathingRate, WarmupGate } from './gating'
import type { SignalQuality, SignalSample } from './types'

const sample = (overrides: Partial<SignalSample['breathingRate']> = {}, quality: SignalQuality = { kind: 'ok' }): SignalSample => ({
  timestampMs: 1_700_000_000_000,
  quality,
  breathingRate: { value: 12, confidence: 60, stable: true, timestampMs: 1_700_000_000_000, ...overrides }
})

describe('documented breathing-rate gate', () => {
  it('classifies every rejection reason without retaining a physiological value', () => {
    expect(breathingRateGate(sample({}, { kind: 'warming' })).reason).toBe('warmup')
    expect(breathingRateGate(sample({ confidence: 44 })).reason).toBe('lowConfidence')
    expect(breathingRateGate(sample({ stable: false })).reason).toBe('unstable')
    expect(breathingRateGate(sample({ value: 3.9 })).reason).toBe('outOfRange')
    expect(breathingRateGate(sample({ timestampMs: Number.NaN })).reason).toBe('badTimestamp')
    expect(breathingRateGate(sample()).reason).toBe('accepted')
  })

  it('uses documented percentage confidence and preserves the 4–45 product range', () => {
    expect(BREATHING_RATE_MIN_CONFIDENCE).toBe(45)
    expect(usableBreathingRate(sample({ confidence: 45, value: 4 }))).toBe(4)
    expect(usableBreathingRate(sample({ confidence: 100, value: 45 }))).toBe(45)
    expect(usableBreathingRate(sample({ confidence: 44.99 }))).toBeUndefined()
    expect(usableBreathingRate(sample({ value: 45.1 }))).toBeUndefined()
  })

  it('accepts a documented stable measurement after warm-up even if the separate validation status is poor', () => {
    expect(usableBreathingRate(sample({}, { kind: 'poor', message: 'Adjust framing.' }))).toBe(12)
  })

  it('counts only unique SDK timestamps and records one rejection reason per unique sample', () => {
    const counter = new UniqueRateGateCounter()
    expect(counter.observe(sample({ timestampMs: 1_700_000_000_000 }))).toBe(true)
    expect(counter.observe(sample({ timestampMs: 1_700_000_000_000 }))).toBe(false)
    expect(counter.observe(sample({ timestampMs: 1_700_000_001_000, confidence: 40 }))).toBe(true)
    expect(counter.observe(sample({ timestampMs: Number.NaN }))).toBe(false)
    expect(counter.uniqueSamples).toBe(2)
    expect(counter.counts).toEqual({ warmup: 0, unstable: 0, lowConfidence: 1, outOfRange: 0, badTimestamp: 1, accepted: 1 })
  })
})

describe('warm-up and baseline', () => {
  it('defaults to the documented 30-second breathing analysis window', () => {
    const gate = new WarmupGate(undefined, 1_000)
    expect(gate.isReady(30_999)).toBe(false)
    expect(gate.isReady(31_000)).toBe(true)
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
