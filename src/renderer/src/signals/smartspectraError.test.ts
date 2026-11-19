import { describe, expect, it, vi } from 'vitest'
import { SmartSpectraErrorCode } from '@smartspectra/node-sdk/renderer'
import { SmartSpectraSignalSource, SUSTAINED_LOW_FRAME_RATE_MESSAGE } from './smartspectra'

type SourceInternals = {
  stream?: MediaStream
  options?: { onFatalError?: (message: string) => void }
  stopping: boolean
  liveTestEnabled: boolean
  reconnect: { nextDelay(): number | undefined }
  handleError(code: number, message: string, retryable: boolean): Promise<void>
}

describe('SmartSpectra sustained low frame rate handling', () => {
  it('stops tracks and reports a terminal error without retrying', async () => {
    const track = { stop: vi.fn() }
    const fatal = vi.fn()
    const source = new SmartSpectraSignalSource()
    const internals = source as unknown as SourceInternals
    internals.stream = { getTracks: () => [track] } as unknown as MediaStream
    internals.options = { onFatalError: fatal }
    internals.stopping = false
    internals.liveTestEnabled = false
    const retry = vi.spyOn(internals.reconnect, 'nextDelay')

    await internals.handleError(SmartSpectraErrorCode.kSustainedLowFrameRate, 'low frame rate', true)

    expect(retry).not.toHaveBeenCalled()
    expect(track.stop).toHaveBeenCalledOnce()
    expect(fatal).toHaveBeenCalledWith(SUSTAINED_LOW_FRAME_RATE_MESSAGE)
  })
})
