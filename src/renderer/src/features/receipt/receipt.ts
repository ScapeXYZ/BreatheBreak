export const RECEIPT_BASELINE_SECONDS = 25
export const RECEIPT_GUIDED_SECONDS = 45
export const RECEIPT_TOTAL_SECONDS_APPROXIMATE = 75
export const RECEIPT_INSUFFICIENT_COPY = 'Not enough stable readings for a receipt'
export const RECEIPT_DISCLOSURE = 'Measured by SmartSpectra. Not a score. Not medical.'

export type ReceiptMeasurementPhase = 'baseline' | 'guided'
export type ReceiptReading = Readonly<{ value: number; phase: ReceiptMeasurementPhase; stable: boolean; gated: boolean }>
export type ReceiptCalculation = Readonly<{ before?: number; after?: number; change?: number; sufficient: boolean }>
export type ReceiptTimelinePhase = 'idle' | 'baseline' | 'guided' | 'complete'
export type ReceiptTimelineEvent = 'session-start' | 'pacer-start' | 'pacer-end' | 'session-end'

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

export function calculateReceipt(readings: readonly ReceiptReading[]): ReceiptCalculation {
  const valid = readings.filter((reading) => reading.gated && reading.stable && Number.isFinite(reading.value) && reading.value >= 4 && reading.value <= 45)
  const baseline = valid.filter((reading) => reading.phase === 'baseline').map((reading) => reading.value)
  const guided = valid.filter((reading) => reading.phase === 'guided').map((reading) => reading.value)
  const before = baseline.length >= 3 ? median(baseline) : undefined
  const after = guided.length >= 3 ? median(guided.slice(-3)) : undefined
  if (before === undefined || after === undefined) return Object.freeze({ before, after, sufficient: false })
  return Object.freeze({ before, after, change: after - before, sufficient: true })
}

export function advanceReceiptTimeline(phase: ReceiptTimelinePhase, event: ReceiptTimelineEvent): ReceiptTimelinePhase {
  if (event === 'session-start') return phase === 'idle' ? 'baseline' : phase
  if (event === 'pacer-start') return phase === 'baseline' ? 'guided' : phase
  if (event === 'pacer-end') return phase === 'guided' ? 'complete' : phase
  return 'idle'
}
