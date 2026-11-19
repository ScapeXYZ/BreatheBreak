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
  private stopped = false

  constructor(
    private readonly stream: MediaStream,
    private readonly video: FrameVideo = document.createElement('video'),
    private readonly schedule: (callback: () => void, milliseconds: number) => ReturnType<typeof setTimeout> = (callback, milliseconds) => window.setTimeout(callback, milliseconds) as ReturnType<typeof setTimeout>
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
    this.video.pause()
    this.video.srcObject = null
  }

  private requestFrame(): void {
    if (this.stopped) return
    this.callbackId = this.video.requestVideoFrameCallback((now) => {
      this.frameTimes.push(now)
      this.requestFrame()
    })
  }
}

export class FrameStallWatchdog {
  private timer?: ReturnType<typeof setTimeout>

  constructor(
    private readonly onStall: () => void,
    private readonly schedule: (callback: () => void, milliseconds: number) => ReturnType<typeof setTimeout> = (callback, milliseconds) => window.setTimeout(callback, milliseconds) as ReturnType<typeof setTimeout>,
    private readonly cancel: (timer: ReturnType<typeof setTimeout>) => void = (timer) => window.clearTimeout(timer as number)
  ) {}

  start(): void { this.arm() }
  observeFrame(): void { this.arm() }

  stop(): void {
    if (this.timer !== undefined) this.cancel(this.timer)
    this.timer = undefined
  }

  private arm(): void {
    if (this.timer !== undefined) this.cancel(this.timer)
    this.timer = this.schedule(() => {
      this.timer = undefined
      this.onStall()
    }, CAMERA_STALL_TIMEOUT_MS)
  }
}
