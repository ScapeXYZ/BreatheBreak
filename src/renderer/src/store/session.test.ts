import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from './session'

describe('session state', () => {
  beforeEach(() => {
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key)
    })
    localStorage.clear()
    useSession.setState({ phase: 'welcome', consented: false, source: 'smartspectra', cameraId: undefined, sample: undefined, error: undefined, startedAt: undefined, gatedRates: [], recap: undefined })
  })

  it('requires consent before entering starting', () => {
    useSession.getState().begin()
    expect(useSession.getState().phase).toBe('welcome')
    useSession.getState().setConsent(true)
    useSession.getState().begin()
    expect(useSession.getState().phase).toBe('starting')
  })

  it('moves through running, reconnecting, and stopping', () => {
    useSession.getState().setConsent(true); useSession.getState().begin(); useSession.getState().running()
    expect(useSession.getState().phase).toBe('running')
    useSession.getState().reconnecting(); expect(useSession.getState().phase).toBe('reconnecting')
    useSession.getState().stopping(); expect(useSession.getState().phase).toBe('stopping')
  })

  it('retains the last sample while reconnecting', () => {
    const sample = { timestampMs: 1, quality: { kind: 'ok' as const }, chestTrace: 0.4 }
    useSession.getState().receive(sample, 12)
    useSession.getState().reconnecting()
    expect(useSession.getState().sample).toEqual(sample)
    expect(useSession.getState().gatedRates).toEqual([12])
  })

  it('builds a recap and robust baseline from gated rates only', () => {
    useSession.setState({ startedAt: Date.now() - 2_000, gatedRates: [10, 11, 12, 100] })
    useSession.getState().finish()
    expect(useSession.getState().phase).toBe('recap')
    expect(useSession.getState().recap).toMatchObject({ sampleCount: 4, baseline: { median: 11.5, mad: 1 }, source: 'smartspectra' })
  })

  it('persists camera selection locally and can clear it', () => {
    useSession.getState().setCamera('camera-2')
    expect(localStorage.getItem('breathebreak.cameraId')).toBe('camera-2')
    useSession.getState().setCamera(undefined)
    expect(localStorage.getItem('breathebreak.cameraId')).toBeNull()
  })
})
