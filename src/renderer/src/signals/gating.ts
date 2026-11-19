import type { SignalSample } from './types'
import type { ConfidenceBinCounts } from '../../../shared/liveTest'

export const BREATHING_RATE_MIN_CONFIDENCE = 45
export type RateGateReason = 'warmup' | 'unstable' | 'lowConfidence' | 'outOfRange' | 'badTimestamp' | 'accepted'
export type RateGateCounts = Record<RateGateReason, number>
const emptyRateGateCounts = (): RateGateCounts => ({ warmup: 0, unstable: 0, lowConfidence: 0, outOfRange: 0, badTimestamp: 0, accepted: 0 })
const emptyConfidenceBins = (): ConfidenceBinCounts => ({ confidence0To19: 0, confidence20To44: 0, confidence45To69: 0, confidence70To100: 0 })

export function breathingRateGate(sample: SignalSample): Readonly<{ reason: RateGateReason; value?: number }> {
  const rate = sample.breathingRate
  if (!rate || !Number.isFinite(rate.timestampMs) || rate.timestampMs <= 0) return { reason: 'badTimestamp' }
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
  private bins: ConfidenceBinCounts = emptyConfidenceBins()
  get uniqueSamples(): number { return this.timestamps.size }
  get counts(): Readonly<RateGateCounts> { return this.totals }
  get confidenceBins(): Readonly<ConfidenceBinCounts> { return this.bins }
  reset(): void { this.timestamps.clear(); this.totals = emptyRateGateCounts(); this.bins = emptyConfidenceBins() }
  observe(sample: SignalSample): boolean {
    const timestamp = sample.breathingRate?.timestampMs
    if (!Number.isFinite(timestamp)) { this.totals.badTimestamp += 1; return false }
    if (this.timestamps.has(timestamp!)) return false
    this.timestamps.add(timestamp!)
    const confidence = sample.breathingRate?.confidence
    if (Number.isFinite(confidence) && confidence! >= 0 && confidence! < 20) this.bins.confidence0To19 += 1
    else if (Number.isFinite(confidence) && confidence! >= 20 && confidence! < 45) this.bins.confidence20To44 += 1
    else if (Number.isFinite(confidence) && confidence! >= 45 && confidence! < 70) this.bins.confidence45To69 += 1
    else if (Number.isFinite(confidence) && confidence! >= 70 && confidence! <= 100) this.bins.confidence70To100 += 1
    const result = breathingRateGate(sample)
    this.totals[result.reason] += 1
    return true
  }
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
