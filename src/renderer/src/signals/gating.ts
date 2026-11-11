import type { SignalSample } from './types'

export function usableBreathingRate(sample: SignalSample): number | undefined {
  const rate = sample.breathingRate
  if (!rate || sample.quality.kind !== 'ok' || !rate.stable || rate.confidence <= 0) return undefined
  return rate.value
}
