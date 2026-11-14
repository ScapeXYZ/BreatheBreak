export const LIVE_TEST_SENTINEL = 'R1_AUTHORIZED'
export const LIVE_TEST_DIAGNOSTIC_INTERVAL_MS = 5_000
export const LIVE_TEST_DIAGNOSTIC_RELATIVE_PATH = '.diagnostics/r1-live-test.ndjson'

export type LiveTestCounters = Readonly<{ deliveredFrames: number; sentFrames: number; rateSamples: number; uniqueRateSamples: number; chestSamples: number; goodSignalSamples: number; signalSamples: number; warmup: number; unstable: number; lowConfidence: number; outOfRange: number; badTimestamp: number; accepted: number }>
export type LiveTestDiagnosticRecord = Readonly<{ timestamp: string; deliveredFrames: number; sentFrames: number; rateSamples: number; uniqueRateSamples: number; chestSamples: number; warmup: number; unstable: number; lowConfidence: number; outOfRange: number; badTimestamp: number; accepted: number; cpuPercent: number; goodSignalWindowShare: number }>
export const LIVE_TEST_EVENTS = ['session-start', 'pacer-start', 'pacer-end', 'stop-clicked', 'media-tracks-stopped', 'sdk-error'] as const
export type LiveTestEvent = typeof LIVE_TEST_EVENTS[number]
export type LiveTestEventPayload = Readonly<{ event: 'session-start'; cameraLabel: string }> | Readonly<{ event: 'sdk-error'; code: number }> | Readonly<{ event: Exclude<LiveTestEvent, 'session-start' | 'sdk-error'> }>
export type LiveTestEventRecord = Readonly<{ timestamp: string } & LiveTestEventPayload>
export const EMPTY_LIVE_TEST_COUNTERS: LiveTestCounters = Object.freeze({ deliveredFrames: 0, sentFrames: 0, rateSamples: 0, uniqueRateSamples: 0, chestSamples: 0, goodSignalSamples: 0, signalSamples: 0, warmup: 0, unstable: 0, lowConfidence: 0, outOfRange: 0, badTimestamp: 0, accepted: 0 })

export function isLiveTestEnabled(value: string | undefined): boolean {
  return value === LIVE_TEST_SENTINEL
}

export function retryAttemptsForLiveTest(enabled: boolean): number {
  return enabled ? 0 : 3
}

export function validLiveTestCounters(value: unknown): value is LiveTestCounters {
  if (!value || typeof value !== 'object') return false
  const counters = value as Record<string, unknown>
  if (Object.keys(counters).length !== Object.keys(EMPTY_LIVE_TEST_COUNTERS).length) return false
  const nonNegativeInteger = (key: keyof LiveTestCounters): boolean => Number.isSafeInteger(counters[key]) && Number(counters[key]) >= 0
  return (Object.keys(EMPTY_LIVE_TEST_COUNTERS) as Array<keyof LiveTestCounters>).every(nonNegativeInteger) && Number(counters.sentFrames) <= Number(counters.deliveredFrames) && Number(counters.goodSignalSamples) <= Number(counters.signalSamples)
}

export function isGoodSignalWindow(current: LiveTestCounters, previous: LiveTestCounters): boolean {
  const signalSamples = Math.max(0, current.signalSamples - previous.signalSamples)
  const goodSamples = Math.max(0, current.goodSignalSamples - previous.goodSignalSamples)
  return signalSamples > 0 && goodSamples / signalSamples >= 0.5
}

export function liveTestDiagnosticRecord(timestamp: Date, current: LiveTestCounters, previous: LiveTestCounters, cpuPercent: number, goodSignalWindowShare: number): LiveTestDiagnosticRecord {
  const delta = (key: keyof LiveTestCounters): number => Math.max(0, current[key] - previous[key])
  return Object.freeze({ timestamp: timestamp.toISOString(), deliveredFrames: current.deliveredFrames, sentFrames: current.sentFrames, rateSamples: delta('rateSamples'), uniqueRateSamples: delta('uniqueRateSamples'), chestSamples: delta('chestSamples'), warmup: delta('warmup'), unstable: delta('unstable'), lowConfidence: delta('lowConfidence'), outOfRange: delta('outOfRange'), badTimestamp: delta('badTimestamp'), accepted: delta('accepted'), cpuPercent, goodSignalWindowShare })
}

export function liveTestEventRecord(timestamp: Date, payload: LiveTestEventPayload): LiveTestEventRecord {
  return Object.freeze({ timestamp: timestamp.toISOString(), ...payload })
}

export function validLiveTestEvent(value: unknown): value is LiveTestEventPayload {
  if (!value || typeof value !== 'object') return false
  const payload = value as Record<string, unknown>
  if (payload.event === 'session-start') return Object.keys(payload).length === 2 && typeof payload.cameraLabel === 'string' && payload.cameraLabel.length > 0 && payload.cameraLabel.length <= 200 && !/[\r\n]/.test(payload.cameraLabel)
  if (payload.event === 'sdk-error') return Object.keys(payload).length === 2 && Number.isSafeInteger(payload.code)
  return Object.keys(payload).length === 1 && LIVE_TEST_EVENTS.includes(payload.event as LiveTestEvent)
}
