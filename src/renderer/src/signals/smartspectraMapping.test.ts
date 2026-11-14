import { describe, expect, it } from 'vitest'
import { decodeMetrics, Metrics } from '@smartspectra/node-sdk/messages'
import { usableBreathingRate } from './gating'
import { mapSmartSpectraMetrics } from './smartspectraMapping'

describe('real SmartSpectra schema mapping (synthetic values only)', () => {
  it('maps value in breaths/minute, percentage confidence, stable, and epoch-microsecond timestamp end to end', () => {
    const timestampUs = 1_700_000_000_123_000
    const encoded = Metrics.encode({ breathing: { rate: [{ value: 12, confidence: 60, stable: true, timestamp: timestampUs }] } }).finish()
    const mapped = mapSmartSpectraMetrics(decodeMetrics(encoded), timestampUs, { kind: 'ok' })
    expect(mapped.rateSamples).toHaveLength(1)
    expect(mapped.rateSamples[0].breathingRate).toEqual({ value: 12, confidence: 60, stable: true, timestampMs: timestampUs / 1_000 })
    expect(usableBreathingRate(mapped.rateSamples[0])).toBe(12)
  })

  it('uses SDK confidence and stability regardless of separate validation status', () => {
    const timestampUs = 1_700_000_000_123_000
    const encode = (confidence: number, stable: boolean) => Metrics.encode({ breathing: { rate: [{ value: 12, confidence, stable, timestamp: timestampUs }] } }).finish()
    const warm = mapSmartSpectraMetrics(decodeMetrics(encode(60, true)), timestampUs, { kind: 'warming' }).rateSamples[0]
    const low = mapSmartSpectraMetrics(decodeMetrics(encode(40, false)), timestampUs, { kind: 'ok' }).rateSamples[0]
    const accepted = mapSmartSpectraMetrics(decodeMetrics(encode(45, true)), timestampUs, { kind: 'poor' }).rateSamples[0]
    expect(usableBreathingRate(warm)).toBe(12)
    expect(usableBreathingRate(low)).toBeUndefined()
    expect(usableBreathingRate(accepted)).toBe(12)
  })

  it('rejects a missing SDK measurement timestamp rather than substituting the callback timestamp', () => {
    const encoded = Metrics.encode({ breathing: { rate: [{ value: 12, confidence: 60, stable: true }] } }).finish()
    const mapped = mapSmartSpectraMetrics(decodeMetrics(encoded), 1_700_000_000_123_000, { kind: 'ok' }).rateSamples[0]
    expect(mapped.breathingRate?.timestampMs).toBeNaN()
    expect(usableBreathingRate(mapped)).toBeUndefined()
  })
})
