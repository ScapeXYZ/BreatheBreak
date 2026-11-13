import type { CameraDevice, SignalListener, SignalSource } from '../../src/renderer/src/signals/types'

const blocked = (): never => { throw new Error('SmartSpectra is disabled in the screenshot harness.') }
export class SmartSpectraSignalSource implements SignalSource {
  readonly kind = 'smartspectra' as const
  readonly label = 'SmartSpectra disabled for screenshots'
  readonly available = false
  async listCameras(): Promise<CameraDevice[]> { return [] }
  async start(_listener: SignalListener): Promise<void> { blocked() }
  async stop(): Promise<void> { /* No SDK or camera exists in this harness. */ }
}
