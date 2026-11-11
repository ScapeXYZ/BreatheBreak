export type SourceKind = 'simulation' | 'smartspectra'
export type SignalQuality = { kind: 'warming' | 'ok' | 'poor'; message?: string }
export type SignalSample = {
  timestampMs: number
  breathingRate?: { value: number; confidence: number; stable: boolean }
  chestTrace?: number
  abdomenTrace?: number
  quality: SignalQuality
}
export type SignalListener = (sample: SignalSample) => void
export interface SignalSource {
  readonly kind: SourceKind
  readonly label: string
  readonly available: boolean
  start(listener: SignalListener): Promise<void>
  stop(): Promise<void>
}
