import type { SignalSample } from './types'

export const BREATHING_RATE_MIN_CONFIDENCE = 45
export type RateGateReason = 'warmup' | 'unstable' | 'lowConfidence' | 'outOfRange' | 'badTimestamp' | 'accepted'
export type RateGateCounts = Record<RateGateReason, number>
const emptyRateGateCounts = (): RateGateCounts => ({ warmup: 0, unstable: 0, lowConfidence: 0, outOfRange: 0, badTimestamp: 0, accepted: 0 })

export function breathingRateGate(sample: SignalSample): Readonly<{ reason: RateGateReason; value?: number }> {
  const rate = sample.breathingRate
  if (!rate || !Number.isFinite(rate.timestampMs) || rate.timestampMs <= 0) return { reason: 'badTimestamp' }
  if (sample.quality.kind === 'warming') return { reason: 'warmup' }
  if (!Number.isFinite(rate.confidence) || rate.confidence < BREATHING_RATE_MIN_CONFIDENCE) return { reason: 'lowConfidence' }
  if (!rate.stable) return { reason: 'unstable' }
  if (!Number.isFinite(rate.value) || rate.value < 4 || rate.value > 45) return { reason: 'outOfRange' }
  return { reason: 'accepted', value: rate.value }
}

export function usableBreathingRate(sample: SignalSample): number | undefined {
  const result = breathingRateGate(sample)
  return result.reason === 'accepted' ? result.value : undefined
}

export class UniqueRateGateCounter {
  private readonly timestamps = new Set<number>()
  private totals: RateGateCounts = emptyRateGateCounts()
  get uniqueSamples(): number { return this.timestamps.size }
  get counts(): Readonly<RateGateCounts> { return this.totals }
  reset(): void { this.timestamps.clear(); this.totals = emptyRateGateCounts() }
  observe(sample: SignalSample): boolean {
    const timestamp = sample.breathingRate?.timestampMs
    if (!Number.isFinite(timestamp)) { this.totals.badTimestamp += 1; return false }
    if (this.timestamps.has(timestamp!)) return false
    this.timestamps.add(timestamp!)
    const result = breathingRateGate(sample)
    this.totals[result.reason] += 1
    return true
  }
}

export class WarmupGate {
  constructor(private readonly durationMs = 30_000, private readonly startedAtMs = Date.now()) {}
  isReady(nowMs = Date.now()): boolean { return nowMs - this.startedAtMs >= this.durationMs }
}

export function median(values: number[]): number | undefined {
  if (!values.length) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

export function estimateBaseline(values: number[]): { median: number; mad: number } | undefined {
  const center = median(values)
  if (center === undefined) return undefined
  return { median: center, mad: median(values.map((value) => Math.abs(value - center))) ?? 0 }
}
