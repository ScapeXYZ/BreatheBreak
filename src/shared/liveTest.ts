export const LIVE_TEST_SENTINEL = 'R1_AUTHORIZED'
export const LIVE_TEST_DIAGNOSTIC_INTERVAL_MS = 5_000
export const LIVE_TEST_DIAGNOSTIC_RELATIVE_PATH = '.diagnostics/r1-live-test.ndjson'

export type LiveTestCounters = Readonly<{ deliveredFrames: number; sentFrames: number }>
export type LiveTestDiagnosticRecord = Readonly<{ timestamp: string; deliveredFrames: number; sentFrames: number; cpuPercent: number }>

export function isLiveTestEnabled(value: string | undefined): boolean {
  return value === LIVE_TEST_SENTINEL
}

export function retryAttemptsForLiveTest(enabled: boolean): number {
  return enabled ? 0 : 3
}

export function validLiveTestCounters(value: unknown): value is LiveTestCounters {
  if (!value || typeof value !== 'object') return false
  const counters = value as Record<string, unknown>
  return Object.keys(counters).length === 2 &&
    Number.isSafeInteger(counters.deliveredFrames) && Number(counters.deliveredFrames) >= 0 &&
    Number.isSafeInteger(counters.sentFrames) && Number(counters.sentFrames) >= 0 &&
    Number(counters.sentFrames) <= Number(counters.deliveredFrames)
}

export function liveTestDiagnosticRecord(timestamp: Date, counters: LiveTestCounters, cpuPercent: number): LiveTestDiagnosticRecord {
  return Object.freeze({ timestamp: timestamp.toISOString(), deliveredFrames: counters.deliveredFrames, sentFrames: counters.sentFrames, cpuPercent })
}
