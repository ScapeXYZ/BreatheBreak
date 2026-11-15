export const RECEIPT_BASELINE_TARGET_READINGS = 3
export const RECEIPT_BASELINE_MAX_SECONDS = 45
export const RECEIPT_GUIDED_SECONDS = 45
export const RECEIPT_TOTAL_SECONDS_APPROXIMATE = 90
export const RECEIPT_INSUFFICIENT_COPY = 'Not enough stable readings for a receipt'
export const RECEIPT_DISCLOSURE = 'Measured by SmartSpectra. Not a score. Not medical.'
export const RECEIPT_MIN_READINGS_PER_PHASE = 2
export function baselineCompletionReason(acceptedReadings: number, elapsedSeconds: number): 'count' | 'cap' | undefined {
  if (acceptedReadings >= RECEIPT_BASELINE_TARGET_READINGS) return 'count'
  if (elapsedSeconds >= RECEIPT_BASELINE_MAX_SECONDS) return 'cap'
  return undefined
}

export type ReceiptMeasurementPhase = 'baseline' | 'guided'
export type ReceiptReading = Readonly<{ value: number; phase: ReceiptMeasurementPhase; stable: boolean; gated: boolean }>
export type ReceiptCalculation = Readonly<{ before?: number; after?: number; change?: number; beforeCount: number; afterCount: number; sufficient: boolean }>
export type ReceiptKind = 'full' | 'partial' | 'insufficient' | 'interrupted'
export type ReceiptSummary = Readonly<{
  kind: ReceiptKind
  before?: number
  after?: number
  change?: number
  median?: number
  minimum?: number
  maximum?: number
  count: number
  beforeCount: number
  afterCount: number
}>
export type ReceiptTimelinePhase = 'idle' | 'baseline' | 'guided' | 'complete'
export type ReceiptTimelineEvent = 'session-start' | 'pacer-start' | 'pacer-end' | 'session-end'

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

const acceptedValues = (readings: readonly ReceiptReading[]): ReceiptReading[] => readings.filter((reading) => reading.gated && reading.stable && Number.isFinite(reading.value) && reading.value >= 4 && reading.value <= 45)

export function calculateReceipt(readings: readonly ReceiptReading[]): ReceiptCalculation {
  const valid = acceptedValues(readings)
  const baseline = valid.filter((reading) => reading.phase === 'baseline').map((reading) => reading.value)
  const guided = valid.filter((reading) => reading.phase === 'guided').map((reading) => reading.value)
  const before = baseline.length >= RECEIPT_MIN_READINGS_PER_PHASE ? median(baseline) : undefined
  const after = guided.length >= RECEIPT_MIN_READINGS_PER_PHASE ? median(guided.slice(-3)) : undefined
  if (before === undefined || after === undefined) return Object.freeze({ before, after, beforeCount: baseline.length, afterCount: guided.length, sufficient: false })
  return Object.freeze({ before, after, change: after - before, beforeCount: baseline.length, afterCount: guided.length, sufficient: true })
}

export function summarizeReceipt(readings: readonly ReceiptReading[], interrupted = false): ReceiptSummary {
  const valid = acceptedValues(readings)
  const calculation = calculateReceipt(valid)
  const values = valid.map((reading) => reading.value)
  if (interrupted) return Object.freeze({ kind: 'interrupted', count: values.length, beforeCount: calculation.beforeCount, afterCount: calculation.afterCount })
  if (calculation.sufficient) return Object.freeze({ kind: 'full', before: calculation.before, after: calculation.after, change: calculation.change, count: values.length, beforeCount: calculation.beforeCount, afterCount: calculation.afterCount })
  if (values.length >= 2) return Object.freeze({ kind: 'partial', median: median(values), minimum: Math.min(...values), maximum: Math.max(...values), count: values.length, beforeCount: calculation.beforeCount, afterCount: calculation.afterCount })
  return Object.freeze({ kind: 'insufficient', count: values.length, beforeCount: calculation.beforeCount, afterCount: calculation.afterCount })
}

export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

export function advanceReceiptTimeline(phase: ReceiptTimelinePhase, event: ReceiptTimelineEvent): ReceiptTimelinePhase {
  if (event === 'session-start') return phase === 'idle' ? 'baseline' : phase
  if (event === 'pacer-start') return phase === 'baseline' ? 'guided' : phase
  if (event === 'pacer-end') return phase === 'guided' ? 'complete' : phase
  return 'idle'
}
