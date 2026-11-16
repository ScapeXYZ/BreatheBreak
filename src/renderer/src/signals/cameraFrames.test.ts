import { afterEach, describe, expect, it, vi } from 'vitest'
import { CameraFrameMonitor, lowFrameRateMessage, medianDeliveredFps } from './cameraFrames'

class FakeVideo {
  muted = false
  playsInline = false
  srcObject: MediaStream | null = null
  play = vi.fn(async () => undefined)
  pause = vi.fn()
  private callback?: VideoFrameRequestCallback
  requestVideoFrameCallback = vi.fn((callback: VideoFrameRequestCallback) => { this.callback = callback; return 1 })
  cancelVideoFrameCallback = vi.fn()
  frame(now: number): void { const callback = this.callback; this.callback = undefined; callback?.(now, {} as VideoFrameCallbackMetadata) }
}

describe('camera FPS preflight', () => {
  afterEach(() => vi.useRealTimers())

  it('measures median delivered FPS from a mocked stream for three seconds', async () => {
    vi.useFakeTimers()
    const stream = {} as MediaStream
    const video = new FakeVideo()
    const monitor = new CameraFrameMonitor(stream, video)
    const measurement = monitor.measure()
    await vi.waitFor(() => expect(video.play).toHaveBeenCalled())
    for (let time = 0; time <= 3_000; time += 40) video.frame(time)
    await vi.advanceTimersByTimeAsync(3_000)
    expect(await measurement).toBe(25)
    expect(video.srcObject).toBe(stream)
    monitor.stop()
    expect(video.srcObject).toBeNull()
  })

  it('reports zero without enough delivered frames and formats the required warning', () => {
    expect(medianDeliveredFps([100])).toBe(0)
    expect(lowFrameRateMessage(23.6)).toBe('This camera delivers about 24 frames per second. The SDK needs at least 25. Try another camera.')
  })
})
