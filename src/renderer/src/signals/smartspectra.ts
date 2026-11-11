import type { SignalListener, SignalSource } from './types'

/**
 * Deliberately unavailable until the licensed SDK is installed and its documented
 * main/preload bridge can be configured without exposing the API key to renderer code.
 * The intended implementation uses SmartSpectraSDK, breathingMetrics,
 * useMediaStream(), metrics/validationStatus/error events, and stop()/destroy().
 */
export class SmartSpectraSignalSource implements SignalSource {
  readonly kind = 'smartspectra' as const
  readonly label = 'SmartSpectra (integration incomplete)'
  readonly available = false
  async start(_listener: SignalListener): Promise<void> {
    throw new Error('SmartSpectra integration is not configured in this repository.')
  }
  async stop(): Promise<void> {}
}
