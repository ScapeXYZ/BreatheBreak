export type SourceKind = 'simulation' | 'smartspectra'
export type SignalQuality = { kind: 'warming' | 'ok' | 'poor'; message?: string }
export type CameraDevice = { id: string; label: string }
export type SourceStatus = 'running' | 'reconnecting'
export type SignalSample = {
  timestampMs: number
  breathingRate?: { value: number; confidence: number; stable: boolean; timestampMs: number }
  chestTrace?: number
  abdomenTrace?: number
  quality: SignalQuality
}
export type SignalListener = (sample: SignalSample) => void
export interface SignalSource {
  readonly kind: SourceKind
  readonly label: string
  readonly available: boolean
  listCameras(): Promise<CameraDevice[]>
  start(listener: SignalListener, options?: { cameraId?: string; apiKey?: string; onStatus?: (status: SourceStatus, attempt?: number) => void; onFatalError?: (message: string) => void }): Promise<void>
  stop(): Promise<void>
}
