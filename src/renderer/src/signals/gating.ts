import type { SignalSample } from './types'

export function usableBreathingRate(sample: SignalSample): number | undefined {
  const rate = sample.breathingRate
  if (!rate || sample.quality.kind !== 'ok' || !rate.stable || rate.confidence <= 0) return undefined
  if (rate.value < 4 || rate.value > 45) return undefined
  return rate.value
}

export class WarmupGate {
  constructor(private readonly durationMs = 8_000, private readonly startedAtMs = Date.now()) {}
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
