import type { SignalListener, SignalSource } from './types'

export class SimulationSignalSource implements SignalSource {
  readonly kind = 'simulation' as const
  readonly label = 'DEV SIMULATION'
  readonly available = true
  private timer?: ReturnType<typeof setInterval>
  private startedAt = 0

  async start(listener: SignalListener): Promise<void> {
    await this.stop()
    this.startedAt = performance.now()
    this.timer = setInterval(() => {
      const elapsed = (performance.now() - this.startedAt) / 1000
      const phase = elapsed * Math.PI * 0.32
      const warmed = elapsed >= 8
      listener({
        timestampMs: Date.now(),
        breathingRate: { value: 9.6 + Math.sin(elapsed / 9) * 0.8, confidence: warmed ? 0.92 : 0.2, stable: warmed },
        chestTrace: Math.sin(phase),
        abdomenTrace: Math.sin(phase - 0.25) * 0.7,
        quality: warmed ? { kind: 'ok' } : { kind: 'warming', message: 'Synthetic signal warming up' }
      })
    }, 100)
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
  }
}
