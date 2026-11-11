import { describe, expect, it } from 'vitest'
import { usableBreathingRate } from './gating'

describe('usableBreathingRate', () => {
  it('blocks warm-up and unstable values', () => {
    expect(usableBreathingRate({ timestampMs: 1, quality: { kind: 'warming' }, breathingRate: { value: 40, confidence: 1, stable: true } })).toBeUndefined()
    expect(usableBreathingRate({ timestampMs: 1, quality: { kind: 'ok' }, breathingRate: { value: 40, confidence: 1, stable: false } })).toBeUndefined()
  })
  it('passes a stable source-provided value', () => {
    expect(usableBreathingRate({ timestampMs: 1, quality: { kind: 'ok' }, breathingRate: { value: 12, confidence: 0.8, stable: true } })).toBe(12)
  })
})
