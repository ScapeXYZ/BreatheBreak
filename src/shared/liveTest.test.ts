import { describe, expect, it } from 'vitest'
import { EMPTY_LIVE_TEST_COUNTERS, isGoodSignalWindow, isLiveTestEnabled, LIVE_TEST_DIAGNOSTIC_INTERVAL_MS, LIVE_TEST_SENTINEL, liveTestDiagnosticRecord, liveTestEventRecord, retryAttemptsForLiveTest, validLiveTestCounters, validLiveTestEvent } from './liveTest'

describe('R1 live-test safety', () => {
  it('requires the exact explicit sentinel and forces retries to zero', () => {
    expect(isLiveTestEnabled(LIVE_TEST_SENTINEL)).toBe(true)
    expect([undefined, '', '1', 'true', 'r1_authorized', 'R1']).toSatisfy((values: Array<string | undefined>) => values.every((value) => !isLiveTestEnabled(value)))
    expect(retryAttemptsForLiveTest(true)).toBe(0)
    expect(retryAttemptsForLiveTest(false)).toBe(3)
  })

  it('records only allowlisted counts, CPU, timestamps, and signal-window share every five seconds', () => {
    expect(LIVE_TEST_DIAGNOSTIC_INTERVAL_MS).toBe(5_000)
    const current = { ...EMPTY_LIVE_TEST_COUNTERS, deliveredFrames: 20, sentFrames: 18, rateSamples: 7, uniqueRateSamples: 6, chestSamples: 6, goodSignalSamples: 3, signalSamples: 4, warmup: 1, unstable: 1, lowConfidence: 1, outOfRange: 1, badTimestamp: 1, accepted: 1 }
    const previous = { ...EMPTY_LIVE_TEST_COUNTERS, deliveredFrames: 10, sentFrames: 9, rateSamples: 2, uniqueRateSamples: 2, chestSamples: 1 }
    expect(isGoodSignalWindow(current, previous)).toBe(true)
    const record = liveTestDiagnosticRecord(new Date('2026-11-13T12:00:00Z'), current, previous, 2.5, 0.75)
    expect(record).toEqual({ timestamp: '2026-11-13T12:00:00.000Z', deliveredFrames: 20, sentFrames: 18, rateSamples: 5, uniqueRateSamples: 4, chestSamples: 5, warmup: 1, unstable: 1, lowConfidence: 1, outOfRange: 1, badTimestamp: 1, accepted: 1, cpuPercent: 2.5, goodSignalWindowShare: 0.75 })
    expect(Object.keys(record)).toEqual(['timestamp', 'deliveredFrames', 'sentFrames', 'rateSamples', 'uniqueRateSamples', 'chestSamples', 'warmup', 'unstable', 'lowConfidence', 'outOfRange', 'badTimestamp', 'accepted', 'cpuPercent', 'goodSignalWindowShare'])
    expect(JSON.stringify(record)).not.toMatch(/api|key|frameData|breathingRate|chestTrace|value/i)
  })

  it('accepts only the exact non-negative counter schema', () => {
    expect(validLiveTestCounters(EMPTY_LIVE_TEST_COUNTERS)).toBe(true)
    expect(validLiveTestCounters({ ...EMPTY_LIVE_TEST_COUNTERS, sentFrames: 2, deliveredFrames: 1 })).toBe(false)
    expect(validLiveTestCounters({ ...EMPTY_LIVE_TEST_COUNTERS, signalSamples: 1, goodSignalSamples: 2 })).toBe(false)
    expect(validLiveTestCounters({ ...EMPTY_LIVE_TEST_COUNTERS, breathingRate: 12 })).toBe(false)
  })

  it('allowlists lifecycle events, camera label, and integer SDK error code without arbitrary fields', () => {
    const events = [{ event: 'session-start', cameraLabel: 'Camo USB' }, { event: 'pacer-start' }, { event: 'pacer-end' }, { event: 'stop-clicked' }, { event: 'media-tracks-stopped' }, { event: 'sdk-error', code: 7 }]
    expect(events.every(validLiveTestEvent)).toBe(true)
    expect(validLiveTestEvent({ event: 'sdk-error', code: 7, message: 'raw detail' })).toBe(false)
    expect(validLiveTestEvent({ event: 'session-start', cameraLabel: 'camera\nsecret' })).toBe(false)
    expect(validLiveTestEvent({ event: 'breathing-rate', value: 12 })).toBe(false)
    expect(liveTestEventRecord(new Date('2026-11-14T00:00:00Z'), { event: 'media-tracks-stopped' })).toEqual({ timestamp: '2026-11-14T00:00:00.000Z', event: 'media-tracks-stopped' })
  })
})
