// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Metrics } from '@smartspectra/node-sdk/messages'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { RECEIPT_INSUFFICIENT_COPY } from './features/receipt/receipt'
import { sessionRecorder } from './features/sessions/recorder'
import { mapSmartSpectraMetrics } from './signals/smartspectraMapping'
import type { CameraDevice, SignalListener, SignalSource } from './signals/types'
import { useSession } from './store/session'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

class R3ShapedRealSource implements SignalSource {
  readonly kind = 'smartspectra' as const
  readonly label = 'Fake SmartSpectra SDK'
  readonly available = true
  private timers: number[] = []

  async listCameras(): Promise<CameraDevice[]> { return [{ id: 'camo', label: 'Camo' }] }

  async start(listener: SignalListener): Promise<void> {
    await this.stop()
    const seconds = [34, 37, 40, 43, 44, 50, 55, 60, 65, 70, 75]
    seconds.forEach((second, index) => {
      this.timers.push(window.setTimeout(() => {
        const timestampUs = 1_800_000_000_000_000 + second * 1_000_000
        const accepted = second === 44
        const payload = Metrics.encode({ breathing: { rate: [{
          value: 12,
          confidence: accepted ? 45 : 40,
          stable: accepted,
          timestamp: timestampUs
        }] } }).finish()
        const mapped = mapSmartSpectraMetrics(Metrics.decode(payload), timestampUs, accepted ? { kind: 'ok' } : { kind: 'warming' })
        mapped.rateSamples.forEach(listener)
      }, second * 1_000))
    })
  }

  async stop(): Promise<void> {
    this.timers.forEach((timer) => window.clearTimeout(timer))
    this.timers = []
  }
}

let root: Root | undefined
let host: HTMLDivElement | undefined

function button(label: string): HTMLButtonElement {
  const match = [...document.querySelectorAll<HTMLButtonElement>('button')].find((node) => node.textContent?.trim() === label)
  if (!match) throw new Error(`Missing button: ${label}`)
  return match
}

async function click(label: string): Promise<void> {
  await act(async () => { button(label).click(); await Promise.resolve() })
}

async function advance(milliseconds: number): Promise<void> {
  await act(async () => { await vi.advanceTimersByTimeAsync(milliseconds) })
}

beforeAll(() => vi.useFakeTimers())

beforeEach(() => {
  vi.clearAllTimers()
  vi.setSystemTime(new Date('2026-11-14T11:06:08.152Z'))
  const values = new Map<string, string>([['breathebreak.cameraId', 'camo']])
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key), clear: () => values.clear() } })
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { configurable: true, value: () => null })
  Object.defineProperty(window, 'breathebreak', { configurable: true, value: { getRuntimeInfo: vi.fn(), getLiveTestConfig: vi.fn().mockResolvedValue({ enabled: false, writing: false, runId: '' }), beginLiveTestSession: vi.fn(), endLiveTestSession: vi.fn(), copyLiveTestRunReport: vi.fn(), updateLiveTestCounters: vi.fn(), recordLiveTestEvent: vi.fn() } })
  sessionRecorder.clear()
  useSession.setState({ phase: 'welcome', receiptPhase: 'idle', baselineReady: false, baselineAcceptedCount: 0, baselineCompletionReason: undefined, consented: false, source: 'smartspectra', cameraId: 'camo', sample: undefined, error: undefined, startedAt: undefined, gatedRates: [], recap: undefined })
})

afterEach(() => {
  if (root) act(() => root!.unmount())
  host?.remove()
  root = undefined
  host = undefined
  sessionRecorder.clear()
})

afterAll(() => vi.useRealTimers())

describe('R3-shaped real-source journey', () => {
  it('unlocks at the cap, keeps pacing user-started, and records the complete guided phase', async () => {
    const fakeRealSource = new R3ShapedRealSource()
    const sourceOverrides = { smartspectra: fakeRealSource }
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () => { root!.render(<App sourceOverrides={sourceOverrides} />); await Promise.resolve() })

    act(() => document.querySelector<HTMLInputElement>('.consent-check input')!.click())
    await click('Start session')
    expect(useSession.getState()).toMatchObject({ phase: 'running', source: 'smartspectra', baselineReady: false })

    await advance(44_000)
    expect(useSession.getState()).toMatchObject({ baselineAcceptedCount: 1, baselineReady: false })
    await advance(1_000)
    expect(useSession.getState()).toMatchObject({ baselineAcceptedCount: 1, baselineReady: true, baselineCompletionReason: 'cap', receiptPhase: 'baseline' })
    expect(document.body.textContent).toContain('Baseline done. Start your guided minute.')
    expect(document.body.textContent).toContain('Next: open the guided pacer, then press Start guided pacing when you’re ready.')
    expect(button('Open guided pacer').disabled).toBe(false)
    expect(window.breathebreak.recordLiveTestEvent).toHaveBeenCalledWith({ event: 'baseline-complete', reason: 'cap' })
    expect(window.breathebreak.recordLiveTestEvent).not.toHaveBeenCalledWith({ event: 'pacer-start' })

    await click('Open guided pacer')
    await click('Start guided pacing')
    expect(useSession.getState().receiptPhase).toBe('guided')
    expect(window.breathebreak.recordLiveTestEvent).toHaveBeenCalledWith({ event: 'pacer-start' })
    await advance(47_900)
    expect(document.querySelector('.pacer-overlay')?.getAttribute('data-pacer-status')).toBe('running')
    await advance(100)
    expect(document.querySelector('.pacer-overlay')?.getAttribute('data-pacer-status')).toBe('complete')
    expect(sessionRecorder.guidedCompletions.size).toBe(1)
    expect(window.breathebreak.recordLiveTestEvent).toHaveBeenCalledWith({ event: 'pacer-end' })
    await click('Close')

    await click('Stop session')
    expect(useSession.getState().recap).toMatchObject({ source: 'smartspectra', sampleCount: 1, guidedPaceCompleted: true, receiptSufficient: false })
    await advance(300)
    expect(document.querySelector('.recap-signal-note')?.textContent).toBe(RECEIPT_INSUFFICIENT_COPY)
  })
})
