import { describe, expect, it } from 'vitest'
import { isLiveTestEnabled, LIVE_TEST_DIAGNOSTIC_INTERVAL_MS, LIVE_TEST_RELEASE_EVENT, LIVE_TEST_SENTINEL, liveTestDiagnosticRecord, liveTestEventRecord, retryAttemptsForLiveTest, validLiveTestCounters, validLiveTestEvent } from './liveTest'

describe('R1 live-test safety', () => {
  it('requires the exact explicit sentinel and rejects accidental values', () => {
    expect(isLiveTestEnabled(LIVE_TEST_SENTINEL)).toBe(true)
    expect([undefined, '', '1', 'true', 'r1_authorized', 'R1']).toSatisfy((values: Array<string | undefined>) => values.every((value) => !isLiveTestEnabled(value)))
  })

  it('forces automatic retries to zero only in live-test mode', () => {
    expect(retryAttemptsForLiveTest(true)).toBe(0)
    expect(retryAttemptsForLiveTest(false)).toBe(3)
  })

  it('defines five-second diagnostics with an allowlisted schema', () => {
    expect(LIVE_TEST_DIAGNOSTIC_INTERVAL_MS).toBe(5_000)
    const record = liveTestDiagnosticRecord(new Date('2026-11-13T12:00:00Z'), { deliveredFrames: 20, sentFrames: 18 }, 2.5)
    expect(record).toEqual({ timestamp: '2026-11-13T12:00:00.000Z', deliveredFrames: 20, sentFrames: 18, cpuPercent: 2.5 })
    expect(Object.keys(record)).toEqual(['timestamp', 'deliveredFrames', 'sentFrames', 'cpuPercent'])
  })

  it('accepts only monotonic non-negative counter snapshots', () => {
    expect(validLiveTestCounters({ deliveredFrames: 20, sentFrames: 18 })).toBe(true)
    expect(validLiveTestCounters({ deliveredFrames: 1, sentFrames: 2 })).toBe(false)
    expect(validLiveTestCounters({ deliveredFrames: 1, sentFrames: 1, breathingRate: 12 })).toBe(false)
  })
  it('allowlists a timestamp-only media release event', () => {
    expect(validLiveTestEvent(LIVE_TEST_RELEASE_EVENT)).toBe(true)
    expect(validLiveTestEvent('breathing-rate')).toBe(false)
    expect(liveTestEventRecord(new Date('2026-11-14T00:00:00Z'), LIVE_TEST_RELEASE_EVENT)).toEqual({ timestamp: '2026-11-14T00:00:00.000Z', event: 'media-tracks-stopped' })
  })
})
