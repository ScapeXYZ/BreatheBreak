import { MetricType, SmartSpectraErrorCode, SmartSpectraSDK, ValidationCode } from '@smartspectra/node-sdk/renderer'
import { decodeMetrics } from '@smartspectra/node-sdk/messages'
import { negotiatedCameraSettings, realCameraStreamConstraints, stopMediaStream, videoCameras } from './cameras'
import { UniqueRateGateCounter } from './gating'
import { ReconnectionPolicy, wait } from './reconnection'
import type { CameraDevice, SignalListener, SignalQuality, SignalSource, SourceStatus } from './types'
import { retryAttemptsForLiveTest } from '../../../shared/liveTest'
import { mapSmartSpectraMetrics } from './smartspectraMapping'
import { CameraFrameMonitor, FrameStallWatchdog, lowFrameRateMessage, MINIMUM_PREFLIGHT_FPS } from './cameraFrames'

const REQUESTED_METRICS = [MetricType.CHEST_BREATHING, MetricType.BREATHING_RATE, MetricType.ABDOMEN_BREATHING]
export const SUSTAINED_LOW_FRAME_RATE_MESSAGE = 'The camera could not sustain the frame rate needed for measurement. Try a different camera or connection, close other applications, then start a new session.'

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
  private frameMonitor?: CameraFrameMonitor
  private stallWatchdog?: FrameStallWatchdog
  private listener?: SignalListener
  private options?: StartOptions
  private quality: SignalQuality = { kind: 'warming', message: 'Preparing the signal' }
  private reconnect = new ReconnectionPolicy()
  private stopping = false
  private recovering = false
  private liveTestEnabled = false
  private deliveredFrames = 0
  private sentFrames = 0
  private rateSamples = 0
  private chestSamples = 0
  private goodSignalSamples = 0
  private signalSamples = 0
  private rateGateCounter = new UniqueRateGateCounter()
  private counterTimer?: ReturnType<typeof setInterval>

  async listCameras(): Promise<CameraDevice[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return []
    return videoCameras(await navigator.mediaDevices.enumerateDevices())
  }

  async start(listener: SignalListener, options: StartOptions = {}): Promise<void> {
    if (!this.available) throw new Error('Add VITE_SMARTSPECTRA_API_KEY to a local .env file before using the SDK source.')
    if (!options.cameraId) throw new Error('Select an available camera before starting.')
    await this.stop()
    const liveTest = await window.breathebreak.getLiveTestConfig()
    this.liveTestEnabled = liveTest.enabled
    this.reconnect = new ReconnectionPolicy(retryAttemptsForLiveTest(liveTest.enabled))
    this.deliveredFrames = 0
    this.sentFrames = 0
    this.rateSamples = 0
    this.chestSamples = 0
    this.goodSignalSamples = 0
    this.signalSamples = 0
    this.rateGateCounter.reset()
    if (liveTest.enabled) this.counterTimer = setInterval(() => this.reportLiveTestCounters(), 1_000)
    this.listener = listener
    this.options = options
    this.stopping = false
    this.reconnect.reset()
    await this.startAttempt(options.cameraId)
    options.onStatus?.('running')
  }

  private async startAttempt(cameraId: string): Promise<void> {
    const cameras = await this.listCameras()
    const camera = cameras.find((candidate) => candidate.id === cameraId)
    if (!camera) throw new Error('The selected camera is no longer available. Choose another camera.')
    this.quality = { kind: 'warming', message: 'Preparing the signal' }
    this.stream = await navigator.mediaDevices.getUserMedia(realCameraStreamConstraints(cameraId))
    if (this.liveTestEnabled) window.breathebreak.recordLiveTestEvent({ event: 'camera-settings', ...negotiatedCameraSettings(this.stream) })
    const frameMonitor = new CameraFrameMonitor(this.stream)
    this.frameMonitor = frameMonitor
    const deliveredFps = await frameMonitor.measure()
    if (this.liveTestEnabled) window.breathebreak.recordLiveTestEvent({ event: 'camera-fps-preflight', fps: Number(deliveredFps.toFixed(1)) })
    if (deliveredFps < MINIMUM_PREFLIGHT_FPS) {
      this.releaseMediaStream()
      this.stream = undefined
      throw new Error(lowFrameRateMessage(deliveredFps))
    }
    frameMonitor.stop()
    this.frameMonitor = undefined
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
    sdk.on('frameSentThrough', (sent) => {
      this.deliveredFrames += 1
      if (sent) this.sentFrames += 1
      this.stallWatchdog?.observeFrame()
    })
    sdk.on('error', (code, message, retryable) => { void this.handleError(code, message, retryable) })
    try {
      await sdk.start()
      this.stallWatchdog = new FrameStallWatchdog(() => { void this.handleCameraStall() })
      this.stallWatchdog.start()
    } catch (error) { this.release(); throw error }
  }

  private async handleCameraStall(): Promise<void> {
    if (this.stopping) return
    if (this.liveTestEnabled) window.breathebreak.recordLiveTestEvent({ event: 'camera-stalled' })
    const onFatalError = this.options?.onFatalError
    await this.stop()
    onFatalError?.('The camera stopped sending video. Session stopped.')
  }

  private receiveMetrics(buffer: Uint8Array, timestampUs: number): void {
    const decoded = decodeMetrics(buffer)
    if (!decoded.breathing) return
    const quality = this.quality
    const mapped = mapSmartSpectraMetrics(decoded, timestampUs, quality)
    this.signalSamples += 1
    if (quality.kind === 'ok') this.goodSignalSamples += 1
    this.rateSamples += mapped.rateSamples.length
    if (mapped.hasChest) this.chestSamples += 1
    let emittedRate = false
    for (const sample of mapped.rateSamples) {
      if (!this.rateGateCounter.observe(sample)) continue
      this.listener?.(sample)
      emittedRate = true
    }
    if (!emittedRate) this.listener?.(mapped.traceSample)
    this.reportLiveTestCounters()
  }

  private async handleError(code: number, message: string, retryable: boolean): Promise<void> {
    if (this.liveTestEnabled) window.breathebreak.recordLiveTestEvent({ event: 'sdk-error', code })
    if (this.stopping || this.recovering) return
    if (code === SmartSpectraErrorCode.kSustainedLowFrameRate) {
      await this.stop()
      this.options?.onFatalError?.(SUSTAINED_LOW_FRAME_RATE_MESSAGE)
      return
    }
    if (!retryable) {
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
    this.reportLiveTestCounters()
    if (this.counterTimer) clearInterval(this.counterTimer)
    this.counterTimer = undefined
    const sdk = this.sdk
    this.sdk = undefined
    if (sdk) { try { await sdk.stop() } catch { /* Cleanup still continues. */ } sdk.destroy() }
    this.releaseMediaStream()
    this.stream = undefined
    this.listener = undefined
    this.recovering = false
  }

  private releaseMediaStream(): void {
    this.frameMonitor?.stop()
    this.frameMonitor = undefined
    this.stallWatchdog?.stop()
    this.stallWatchdog = undefined
    if (stopMediaStream(this.stream) > 0 && this.liveTestEnabled) window.breathebreak.recordLiveTestEvent({ event: 'media-tracks-stopped' })
  }

  private reportLiveTestCounters(): void {
    if (this.liveTestEnabled) window.breathebreak.updateLiveTestCounters({ deliveredFrames: this.deliveredFrames, sentFrames: this.sentFrames, rateSamples: this.rateSamples, uniqueRateSamples: this.rateGateCounter.uniqueSamples, chestSamples: this.chestSamples, goodSignalSamples: this.goodSignalSamples, signalSamples: this.signalSamples, ...this.rateGateCounter.counts, ...this.rateGateCounter.confidenceBins })
  }

  private release(): void {
    const sdk = this.sdk
    this.sdk = undefined
    if (sdk) { void sdk.stop().catch(() => undefined); sdk.destroy() }
    this.releaseMediaStream()
    this.stream = undefined
  }
}

export { REQUESTED_METRICS }
