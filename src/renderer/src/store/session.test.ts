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
    useSession.setState({ phase: 'welcome', receiptPhase: 'idle', baselineReady: false, consented: false, source: 'smartspectra', cameraId: undefined, sample: undefined, error: undefined, startedAt: undefined, gatedRates: [], recap: undefined })
  })

  it('requires consent before entering starting', () => {
    useSession.getState().begin()
    expect(useSession.getState().phase).toBe('welcome')
    useSession.getState().setConsent(true)
    useSession.getState().begin()
    expect(useSession.getState().phase).toBe('starting')
    expect(useSession.getState().receiptPhase).toBe('baseline')
  })

  it('moves through running, reconnecting, and stopping', () => {
    useSession.getState().setConsent(true); useSession.getState().begin(); useSession.getState().running()
    expect(useSession.getState().phase).toBe('running')
    useSession.getState().reconnecting(); expect(useSession.getState().phase).toBe('reconnecting')
    useSession.getState().stopping(); expect(useSession.getState().phase).toBe('stopping')
  })

  it('places baseline before the guided phase and ends the timeline on Stop', () => {
    useSession.getState().setConsent(true); useSession.getState().begin()
    expect(useSession.getState().receiptPhase).toBe('baseline')
    useSession.getState().startGuided(); expect(useSession.getState().receiptPhase).toBe('baseline')
    useSession.getState().markBaselineReady('cap')
    useSession.getState().startGuided(); expect(useSession.getState().receiptPhase).toBe('guided')
    useSession.getState().endGuided(); expect(useSession.getState().receiptPhase).toBe('complete')
    useSession.getState().finish({ receipt: { kind: 'insufficient', count: 0, beforeCount: 0, afterCount: 0 } }); expect(useSession.getState().receiptPhase).toBe('idle')
  })

  it('makes the real-source pacer ready after baseline without requiring a valid rate', () => {
    useSession.setState({ source: 'smartspectra', receiptPhase: 'baseline', baselineReady: false, gatedRates: [], sample: undefined })
    useSession.getState().markBaselineReady('cap')
    expect(useSession.getState()).toMatchObject({ source: 'smartspectra', receiptPhase: 'baseline', baselineReady: true, gatedRates: [] })
    useSession.getState().startGuided()
    expect(useSession.getState().receiptPhase).toBe('guided')
  })

  it('unlocks after three accepted readings without starting the pacer', () => {
    useSession.setState({ receiptPhase: 'baseline', baselineReady: false, baselineAcceptedCount: 0, gatedRates: [] })
    useSession.getState().receiveRate(10); useSession.getState().receiveRate(11)
    expect(useSession.getState()).toMatchObject({ baselineReady: false, baselineAcceptedCount: 2, receiptPhase: 'baseline' })
    useSession.getState().receiveRate(12)
    expect(useSession.getState()).toMatchObject({ baselineReady: true, baselineAcceptedCount: 3, baselineCompletionReason: 'count', receiptPhase: 'baseline' })
  })

  it('unlocks at the cap with fewer readings and remains user-started', () => {
    useSession.setState({ receiptPhase: 'baseline', baselineReady: false, baselineAcceptedCount: 1, gatedRates: [10] })
    useSession.getState().markBaselineReady('cap')
    expect(useSession.getState()).toMatchObject({ baselineReady: true, baselineCompletionReason: 'cap', receiptPhase: 'baseline' })
  })

  it('retains the last sample while reconnecting', () => {
    const sample = { timestampMs: 1, quality: { kind: 'ok' as const }, chestTrace: 0.4 }
    useSession.getState().receiveSample(sample); useSession.getState().receiveRate(12)
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
    useSession.getState().finish({ guidedPaceCompleted: true, receipt: { kind: 'full', count: 4, beforeCount: 2, afterCount: 2, before: 10.5, after: 12.5, change: 2 } })
    expect(useSession.getState().phase).toBe('recap')
    expect(useSession.getState().recap).toMatchObject({ sampleCount: 4, receiptKind: 'full', before: 10.5, after: 12.5, change: 2, source: 'smartspectra', guidedPaceCompleted: true })
    expect(Object.isFrozen(useSession.getState().recap)).toBe(true)
    expect(useSession.getState().gatedRates).toEqual([])
    expect(useSession.getState().sample).toBeUndefined()
  })

  it('creates a no-data recap without inventing a rate', () => {
    useSession.setState({ source: 'simulation', startedAt: Date.now() - 1_000, gatedRates: [] })
    useSession.getState().finish({ receipt: { kind: 'insufficient', count: 0, beforeCount: 0, afterCount: 0 } })
    expect(useSession.getState().recap).toMatchObject({ sampleCount: 0, receiptKind: 'insufficient', source: 'simulation', guidedPaceCompleted: false })
  })

  it('clears raw data and does not create a recap after a stop failure', () => {
    useSession.setState({ phase: 'stopping', startedAt: 1, gatedRates: [12], sample: { timestampMs: 1, quality: { kind: 'ok' }, chestTrace: 0.4 } })
    useSession.getState().fail('Unable to stop the session cleanly.')
    expect(useSession.getState()).toMatchObject({ phase: 'error', gatedRates: [], sample: undefined, recap: undefined, startedAt: undefined })
  })

  it('Done/reset clears the recap summary', () => {
    useSession.setState({ startedAt: Date.now(), gatedRates: [12] })
    useSession.getState().finish({ receipt: { kind: 'insufficient', count: 1, beforeCount: 0, afterCount: 0 } })
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
