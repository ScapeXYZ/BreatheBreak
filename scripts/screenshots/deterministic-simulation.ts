import type { CameraDevice, SignalListener, SignalSource } from '../../src/renderer/src/signals/types'

const INTERVAL_MS = 100
const FINAL_TICK = 90
const WARMUP_TICK = 80
export class SimulationSignalSource implements SignalSource {
  readonly kind = 'simulation' as const
  readonly label = 'DEV SIMULATION'
  readonly available = true
  private timer?: ReturnType<typeof setInterval>
  private tick = 0
  async listCameras(): Promise<CameraDevice[]> { return [] }
  async start(listener: SignalListener): Promise<void> {
    await this.stop(); this.tick = 0
    this.timer = setInterval(() => {
      this.tick += 1
      const elapsed = this.tick * INTERVAL_MS / 1000
      const phase = elapsed * Math.PI * 0.32
      const warmed = this.tick >= WARMUP_TICK
      listener({ timestampMs: 1_800_000_000_000 + this.tick * INTERVAL_MS,
        breathingRate: { value: 9.6 + Math.sin(elapsed / 9) * 0.8, confidence: warmed ? 0.92 : 0.2, stable: warmed },
        chestTrace: Math.sin(phase), abdomenTrace: Math.sin(phase - 0.25) * 0.7,
        quality: warmed ? { kind: 'ok' } : { kind: 'warming', message: 'Synthetic signal warming up' } })
      if (this.tick >= FINAL_TICK && this.timer) { clearInterval(this.timer); this.timer = undefined }
    }, INTERVAL_MS)
  }
  async stop(): Promise<void> { if (this.timer) clearInterval(this.timer); this.timer = undefined }
}
