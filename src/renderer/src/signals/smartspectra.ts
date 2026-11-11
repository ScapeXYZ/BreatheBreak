import { MetricType, SmartSpectraErrorCode, SmartSpectraSDK, ValidationCode } from '@smartspectra/node-sdk/renderer'
import { decodeMetrics } from '@smartspectra/node-sdk/messages'
import { stopMediaStream, videoCameras } from './cameras'
import { WarmupGate } from './gating'
import { ReconnectionPolicy, wait } from './reconnection'
import type { CameraDevice, SignalListener, SignalQuality, SignalSource, SourceStatus } from './types'

const REQUESTED_METRICS = [MetricType.CHEST_BREATHING, MetricType.BREATHING_RATE, MetricType.ABDOMEN_BREATHING]

export function friendlyQuality(code: number, hint = ''): SignalQuality {
  const messages: Record<number, string> = {
    [ValidationCode.kNoFaceFound]: 'Move into view of the camera.',
    [ValidationCode.kMultipleFacesFound]: 'Only one person should be in view.',
    [ValidationCode.kFaceNotCentered]: 'Center yourself in the frame.',
    [ValidationCode.kTooDark]: 'Try a brighter, even light.',
    [ValidationCode.kTooBright]: 'Reduce strong light on your face.',
    [ValidationCode.kChestNotVisible]: 'Move back until your upper chest is visible.',
    [ValidationCode.kCameraTuning]: 'Camera is adjusting. Hold still for a moment.',
    [ValidationCode.kFrameRateTooLow]: 'Camera is running slowly. Close other camera apps.',
    [ValidationCode.kExcessiveMotion]: 'Hold still for a clearer signal.',
    [ValidationCode.kFaceTooClose]: 'Move a little farther from the camera.',
    [ValidationCode.kFaceTooFar]: 'Move a little closer to the camera.',
    [ValidationCode.kFaceTooHigh]: 'Lower your position in the frame.',
    [ValidationCode.kFaceTooLow]: 'Raise your position in the frame.',
    [ValidationCode.kFaceNotForward]: 'Face the camera directly.'
  }
  return code === ValidationCode.kOk ? { kind: 'ok' } : { kind: 'poor', message: messages[code] ?? (hint || 'Adjust your position and lighting.') }
}

type StartOptions = { cameraId?: string; onStatus?: (status: SourceStatus, attempt?: number) => void; onFatalError?: (message: string) => void }

export class SmartSpectraSignalSource implements SignalSource {
  readonly kind = 'smartspectra' as const
  readonly label = 'SmartSpectra'
  readonly available = Boolean(import.meta.env.VITE_SMARTSPECTRA_API_KEY)
  private sdk?: SmartSpectraSDK
  private stream?: MediaStream
  private listener?: SignalListener
  private options?: StartOptions
  private quality: SignalQuality = { kind: 'warming', message: 'Preparing the signal&' }
  private warmup = new WarmupGate()
  private reconnect = new ReconnectionPolicy()
  private stopping = false
  private recovering = false

  async listCameras(): Promise<CameraDevice[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return []
    return videoCameras(await navigator.mediaDevices.enumerateDevices())
  }

  async start(listener: SignalListener, options: StartOptions = {}): Promise<void> {
    if (!this.available) throw new Error('Add VITE_SMARTSPECTRA_API_KEY to a local .env file before using the SDK source.')
    if (!options.cameraId) throw new Error('Select an available camera before starting.')
    await this.stop()
    this.listener = listener
    this.options = options
    this.stopping = false
    this.reconnect.reset()
    await this.startAttempt(options.cameraId)
    options.onStatus?.('running')
  }

  private async startAttempt(cameraId: string): Promise<void> {
    const cameras = await this.listCameras()
    if (!cameras.some((camera) => camera.id === cameraId)) throw new Error('The selected camera is no longer available. Choose another camera.')
    this.warmup = new WarmupGate()
    this.quality = { kind: 'warming', message: 'Preparing the signal&' }
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { deviceId: { exact: cameraId }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } })
    const sdk = new SmartSpectraSDK({
      apiKey: import.meta.env.VITE_SMARTSPECTRA_API_KEY,
      requestedMetrics: REQUESTED_METRICS,
      enableAccumulatedOutput: false,
      enableTelemetry: false
    })
    this.sdk = sdk
    sdk.useMediaStream(this.stream)
    sdk.on('validationStatus', (code, _timestampUs, hint) => { this.quality = friendlyQuality(code, hint) })
    sdk.on('metrics', (buffer, timestampUs) => this.receiveMetrics(buffer, timestampUs))
    sdk.on('error', (code, message, retryable) => { void this.handleError(code, message, retryable) })
    try { await sdk.start() } catch (error) { this.release(); throw error }
  }

  private receiveMetrics(buffer: Uint8Array, timestampUs: number): void {
    const breathing = decodeMetrics(buffer).breathing
    if (!breathing) return
    const rate = breathing.rate.at(-1)
    const chest = breathing.upperTrace.at(-1)
    const abdomen = breathing.lowerTrace.at(-1)
    const quality = this.warmup.isReady() ? this.quality : { kind: 'warming' as const, message: 'Warming up the breathing signal&' }
    this.listener?.({
      timestampMs: timestampUs / 1000,
      breathingRate: rate ? { value: rate.value ?? 0, confidence: rate.confidence ?? 0, stable: rate.stable ?? false } : undefined,
      chestTrace: chest?.value ?? undefined,
      abdomenTrace: abdomen?.value ?? undefined,
      quality
    })
  }

  private async handleError(code: number, message: string, retryable: boolean): Promise<void> {
    if (this.stopping || this.recovering) return
    if (!retryable && code !== SmartSpectraErrorCode.kSustainedLowFrameRate) {
      await this.stop()
      this.options?.onFatalError?.('The camera signal stopped. Please review the setup and try again.')
      return
    }
    this.recovering = true
    try {
      while (!this.stopping) {
        const delay = this.reconnect.nextDelay()
        if (delay === undefined) {
          await this.stop()
          this.options?.onFatalError?.('Unable to reconnect after three attempts. Please check the camera and try again.')
          return
        }
        this.options?.onStatus?.('reconnecting', this.reconnect.attemptCount)
        this.release()
        await wait(delay)
        if (this.stopping) return
        try {
          await this.startAttempt(this.options?.cameraId ?? '')
          this.reconnect.reset()
          this.options?.onStatus?.('running')
          return
        } catch { /* Continue to the next bounded attempt without exposing SDK details. */ }
      }
    } finally { this.recovering = false }
    void message
  }

  async stop(): Promise<void> {
    this.stopping = true
    const sdk = this.sdk
    this.sdk = undefined
    if (sdk) { try { await sdk.stop() } catch { /* Cleanup still continues. */ } sdk.destroy() }
    stopMediaStream(this.stream)
    this.stream = undefined
    this.listener = undefined
    this.recovering = false
  }

  private release(): void {
    const sdk = this.sdk
    this.sdk = undefined
    if (sdk) { void sdk.stop().catch(() => undefined); sdk.destroy() }
    stopMediaStream(this.stream)
    this.stream = undefined
  }
}

export { REQUESTED_METRICS }
