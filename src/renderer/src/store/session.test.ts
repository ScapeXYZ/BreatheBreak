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

  it('clears measurements and recap without changing the active phase', () => {
    useSession.setState({ phase: 'running', startedAt: 123, gatedRates: [12], sample: { timestampMs: 1, quality: { kind: 'ok' }, chestTrace: 0.4 }, recap: Object.freeze({ durationSeconds: 1, sampleCount: 1, source: 'smartspectra', guidedPaceCompleted: false }) })
    useSession.getState().clearMeasurements()
    expect(useSession.getState()).toMatchObject({ phase: 'running', startedAt: 123, gatedRates: [], sample: undefined, recap: undefined })
  })

  it('builds an immutable recap from gated rates and clears the raw session data', () => {
    useSession.setState({ startedAt: Date.now() - 2_000, gatedRates: [10, 11, 12, 13], sample: { timestampMs: 1, quality: { kind: 'ok' }, chestTrace: 0.4 } })
    useSession.getState().finish({ guidedPaceCompleted: true })
    expect(useSession.getState().phase).toBe('recap')
    expect(useSession.getState().recap).toMatchObject({ sampleCount: 4, averageBreathingRate: 11.5, source: 'smartspectra', guidedPaceCompleted: true })
    expect(Object.isFrozen(useSession.getState().recap)).toBe(true)
    expect(useSession.getState().gatedRates).toEqual([])
    expect(useSession.getState().sample).toBeUndefined()
  })

  it('creates a no-data recap without inventing a rate', () => {
    useSession.setState({ source: 'simulation', startedAt: Date.now() - 1_000, gatedRates: [] })
    useSession.getState().finish()
    expect(useSession.getState().recap).toMatchObject({ sampleCount: 0, averageBreathingRate: undefined, source: 'simulation', guidedPaceCompleted: false })
  })

  it('clears raw data and does not create a recap after a stop failure', () => {
    useSession.setState({ phase: 'stopping', startedAt: 1, gatedRates: [12], sample: { timestampMs: 1, quality: { kind: 'ok' }, chestTrace: 0.4 } })
    useSession.getState().fail('Unable to stop the session cleanly.')
    expect(useSession.getState()).toMatchObject({ phase: 'error', gatedRates: [], sample: undefined, recap: undefined, startedAt: undefined })
  })

  it('Done/reset clears the recap summary', () => {
    useSession.setState({ startedAt: Date.now(), gatedRates: [12] })
    useSession.getState().finish()
    useSession.getState().reset()
    expect(useSession.getState()).toMatchObject({ phase: 'ready', recap: undefined, gatedRates: [] })
  })

  it('persists camera selection locally and can clear it', () => {
    useSession.getState().setCamera('camera-2')
    expect(localStorage.getItem('breathebreak.cameraId')).toBe('camera-2')
    useSession.getState().setCamera(undefined)
    expect(localStorage.getItem('breathebreak.cameraId')).toBeNull()
  })
})
