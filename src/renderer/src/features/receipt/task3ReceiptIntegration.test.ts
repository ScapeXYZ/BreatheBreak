// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { finalizeSuccessfulSession } from '../../App'
import { sessionRecorder } from '../sessions/recorder'
import { calculateReceipt, type ReceiptReading } from './receipt'
import { useSession } from '../../store/session'

const reading = (value: number, phase: 'baseline' | 'guided'): ReceiptReading => ({ value, phase, stable: true, gated: true })

beforeEach(() => {
  sessionRecorder.clear()
  useSession.setState({
    phase: 'stopping', receiptPhase: 'complete', source: 'smartspectra', startedAt: Date.now() - 1_000,
    gatedRates: [], sample: undefined, recap: undefined, pacerInterrupted: false,
    uniqueRateSampleCount: 0, acceptedRateSampleCount: 0
  })
})

afterEach(() => sessionRecorder.clear())

describe('Task 3 receipt integration prerequisites', () => {
  it('calculates a signed comparison from exactly two accepted readings in each phase', () => {
    expect(calculateReceipt([
      reading(10, 'baseline'), reading(14, 'baseline'),
      reading(7, 'guided'), reading(9, 'guided')
    ])).toEqual({ before: 12, after: 8, change: -4, beforeCount: 2, afterCount: 2, sufficient: true })
  })

  it('uses phase-aware baseline and final-guided medians', () => {
    expect(calculateReceipt([
      reading(30, 'baseline'), reading(10, 'baseline'), reading(20, 'baseline'),
      reading(40, 'guided'), reading(8, 'guided'), reading(12, 'guided'), reading(10, 'guided')
    ])).toEqual({ before: 20, after: 10, change: -10, beforeCount: 3, afterCount: 4, sufficient: true })
  })

  it.each([
    ['before', [reading(10, 'baseline'), reading(8, 'guided'), reading(10, 'guided')]],
    ['after', [reading(10, 'baseline'), reading(12, 'baseline'), reading(8, 'guided')]]
  ])('does not expose a complete comparison when %s has insufficient readings', (_phase, readings) => {
    const result = calculateReceipt(readings)
    expect(result.sufficient).toBe(false)
    expect(result).not.toHaveProperty('change')
  })

  it('preserves reliability counts and clears raw readings after finalization', () => {
    useSession.setState({ uniqueRateSampleCount: 9, acceptedRateSampleCount: 4, gatedRates: [10, 14, 8, 10] })
    sessionRecorder.record({ timestampMs: 1, quality: { kind: 'ok' } }, 10, 'baseline')
    sessionRecorder.record({ timestampMs: 2, quality: { kind: 'ok' } }, 14, 'baseline')
    sessionRecorder.record({ timestampMs: 3, quality: { kind: 'ok' } }, 8, 'guided')
    sessionRecorder.record({ timestampMs: 4, quality: { kind: 'ok' } }, 10, 'guided')

    finalizeSuccessfulSession()

    const state = useSession.getState()
    expect(state.recap).toMatchObject({
      uniqueRateSampleCount: 9, acceptedRateSampleCount: 4,
      baselineAcceptedCount: 2, guidedAcceptedCount: 2, receiptSufficient: true
    })
    expect(state.recap).not.toHaveProperty('readings')
    expect(state.recap).not.toHaveProperty('receiptRates')
    expect(state.gatedRates).toEqual([])
    expect(sessionRecorder.size).toBe(0)
  })

  it('invalidates an otherwise eligible receipt after a pacer interruption and exposes no comparison values', () => {
    useSession.setState({ pacerInterrupted: true, uniqueRateSampleCount: 4, acceptedRateSampleCount: 4, gatedRates: [10, 12, 8, 10] })
    sessionRecorder.record({ timestampMs: 1, quality: { kind: 'ok' } }, 10, 'baseline')
    sessionRecorder.record({ timestampMs: 2, quality: { kind: 'ok' } }, 12, 'baseline')
    sessionRecorder.record({ timestampMs: 3, quality: { kind: 'ok' } }, 8, 'guided')
    sessionRecorder.record({ timestampMs: 4, quality: { kind: 'ok' } }, 10, 'guided')

    finalizeSuccessfulSession()

    expect(useSession.getState().recap).toMatchObject({ pacerInterrupted: true, receiptSufficient: false })
    expect(useSession.getState().recap).not.toHaveProperty('before')
    expect(useSession.getState().recap).not.toHaveProperty('after')
    expect(useSession.getState().recap).not.toHaveProperty('change')
  })

  it.skip('renders Before, After, signed change, counts, reliability, and disclosure only for an eligible recap', () => {
    // Pending production wiring: finalizeSuccessfulSession must retain immutable calculated aggregates for the recap UI.
  })
})
