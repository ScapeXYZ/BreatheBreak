export const CAMERA_FPS_PREFLIGHT_MS = 3_000
export const MINIMUM_PREFLIGHT_FPS = 24
export const CAMERA_STALL_TIMEOUT_MS = 8_000

type FrameVideo = Pick<HTMLVideoElement, 'muted' | 'playsInline' | 'srcObject' | 'play' | 'pause' | 'requestVideoFrameCallback' | 'cancelVideoFrameCallback'>

export function medianDeliveredFps(frameTimes: readonly number[]): number {
  if (frameTimes.length < 2) return 0
  const intervals = frameTimes.slice(1).map((time, index) => time - frameTimes[index]).filter((interval) => interval > 0).sort((a, b) => a - b)
  if (intervals.length === 0) return 0
  const middle = Math.floor(intervals.length / 2)
  const median = intervals.length % 2 ? intervals[middle] : (intervals[middle - 1] + intervals[middle]) / 2
  return 1_000 / median
}

export function lowFrameRateMessage(fps: number): string {
  return 'This camera delivers about ' + Math.round(fps) + ' frames per second. The SDK needs at least 25. Try another camera.'
}

export class CameraFrameMonitor {
  private readonly frameTimes: number[] = []
  private callbackId?: number
  private stallTimer?: ReturnType<typeof setTimeout>
  private stallCallback?: () => void
  private stopped = false

  constructor(
    private readonly stream: MediaStream,
    private readonly video: FrameVideo = document.createElement('video'),
    private readonly schedule: (callback: () => void, milliseconds: number) => ReturnType<typeof setTimeout> = setTimeout,
    private readonly cancel: (timer: ReturnType<typeof setTimeout>) => void = clearTimeout
  ) {}

  async measure(durationMs = CAMERA_FPS_PREFLIGHT_MS): Promise<number> {
    this.stopped = false
    this.video.muted = true
    this.video.playsInline = true
    this.video.srcObject = this.stream
    await this.video.play()
    this.requestFrame()
    await new Promise<void>((resolve) => this.schedule(resolve, durationMs))
    return medianDeliveredFps(this.frameTimes)
  }

  stop(): void {
    this.stopped = true
    if (this.callbackId !== undefined) this.video.cancelVideoFrameCallback(this.callbackId)
    this.callbackId = undefined
    if (this.stallTimer !== undefined) this.cancel(this.stallTimer)
    this.stallTimer = undefined
    this.stallCallback = undefined
    this.video.pause()
    this.video.srcObject = null
  }

  watchForStall(callback: () => void): void {
    this.stallCallback = callback
    this.armStallTimer()
  }

  private requestFrame(): void {
    if (this.stopped) return
    this.callbackId = this.video.requestVideoFrameCallback((now) => {
      this.frameTimes.push(now)
      this.armStallTimer()
      this.requestFrame()
    })
  }

  private armStallTimer(): void {
    if (!this.stallCallback || this.stopped) return
    if (this.stallTimer !== undefined) this.cancel(this.stallTimer)
    this.stallTimer = this.schedule(() => {
      this.stallTimer = undefined
      this.stallCallback?.()
    }, CAMERA_STALL_TIMEOUT_MS)
  }
}
