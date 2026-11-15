import type { CameraDevice, SignalListener, SignalSource } from '../../src/renderer/src/signals/types'

export class SmartSpectraSignalSource implements SignalSource {
  readonly kind='smartspectra' as const
  readonly label='SmartSpectra disabled'
  readonly available=false
  async listCameras():Promise<CameraDevice[]>{throw new Error('Camera enumeration is disabled in simulation-only mode.')}
  async start(_listener:SignalListener):Promise<void>{throw new Error('SmartSpectra is disabled in simulation-only mode.')}
  async stop():Promise<void>{return undefined}
}
