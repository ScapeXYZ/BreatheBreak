import type { presage } from '@smartspectra/node-sdk/messages'
import type { SignalQuality, SignalSample } from './types'

type SdkTimestamp = number | { toString(): string } | null | undefined

export function sdkTimestampToMilliseconds(timestamp: SdkTimestamp): number {
  const microseconds = typeof timestamp === 'number' ? timestamp : Number(timestamp?.toString())
  return Number.isFinite(microseconds) && microseconds > 0 ? microseconds / 1_000 : Number.NaN
}

export function mapSmartSpectraMetrics(metrics: presage.smartspectra.Metrics, callbackTimestampUs: number, quality: SignalQuality): Readonly<{ rateSamples: SignalSample[]; traceSample: SignalSample; hasChest: boolean }> {
  const breathing = metrics.breathing
  const chest = breathing?.upperTrace?.at(-1)?.value ?? undefined
  const abdomen = breathing?.lowerTrace?.at(-1)?.value ?? undefined
  const base = { chestTrace: chest, abdomenTrace: abdomen, quality }
  const rateSamples = (breathing?.rate ?? []).map((rate) => {
    const timestampMs = sdkTimestampToMilliseconds(rate.timestamp)
    return {
      ...base,
      timestampMs,
      breathingRate: { value: rate.value ?? Number.NaN, confidence: rate.confidence ?? Number.NaN, stable: rate.stable ?? false, timestampMs }
    }
  })
  return Object.freeze({ rateSamples, traceSample: { ...base, timestampMs: callbackTimestampUs / 1_000 }, hasChest: chest !== undefined })
}
