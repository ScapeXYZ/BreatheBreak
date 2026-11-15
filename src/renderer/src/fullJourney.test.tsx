// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { sessionRecorder } from './features/sessions/recorder'
import { useSession } from './store/session'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
let host: HTMLDivElement | undefined

function button(label: string): HTMLButtonElement {
  const match = [...document.querySelectorAll<HTMLButtonElement>('button')].find((node) => node.textContent?.trim() === label)
  if (!match) throw new Error(`Missing button: ${label}`)
  return match
}

async function click(label: string): Promise<void> {
  await act(async () => {
    button(label).click()
    await Promise.resolve()
  })
}

async function advance(milliseconds: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds)
  })
}

function expectSimulationDisclosure(): void {
  expect(document.body.textContent).toContain('Dev simulation: synthetic data, not demo evidence')
}

async function runJourney(width: number, height: number): Promise<void> {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
  if (!host) {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () => root!.render(<App />))
    expect(document.querySelector('.simulation-disclosure')).toBeNull()
    expect(document.querySelector('.camera-status')?.textContent).toBe('Camera: off')
  } else {
    const existingConsent = document.querySelector<HTMLInputElement>('.consent-check input')!
    if (existingConsent.checked) act(() => existingConsent.click())
  }

  const source = document.querySelector<HTMLSelectElement>('.field-label select')!
  act(() => {
    source.value = 'simulation'
    source.dispatchEvent(new Event('change', { bubbles: true }))
  })
  expect(button('Start session').disabled).toBe(true)
  expectSimulationDisclosure()
  expect(document.querySelector('.camera-status')?.textContent).toBe('Camera: off, simulation')

  const consent = document.querySelector<HTMLInputElement>('.consent-check input')!
  act(() => {
    consent.click()
  })
  expect(button('Start session').disabled).toBe(false)
  await click('Start session')
  expect(useSession.getState().phase).toBe('running')
  await advance(1_000)
  expect(document.querySelector('.rate-value')?.textContent).toBe('—')
  expect(document.body.textContent).toContain('Measuring…')
  expect(document.body.textContent).toContain('Your breathing, live')
  expect(document.body.textContent).not.toContain('Flower quality')
  expect(document.querySelector('.signal-list dt')?.textContent).toBe('Signal')
  expect(document.querySelector('canvas[aria-label="Live measured breathing flower"]')).toBeTruthy()
  expectSimulationDisclosure()

  expect(button('Collecting baseline…').disabled).toBe(true)
  expect(document.body.textContent).toContain('Natural breathing: 0 of 3 readings')
  await advance(31_000)
  expect(document.body.textContent).toContain('Baseline done. Start your guided minute.')
  expect(useSession.getState().gatedRates.length).toBeGreaterThanOrEqual(3)
  const opener = button('Open guided pacer')
  opener.focus()
  await click('Open guided pacer')
  expect(document.activeElement?.getAttribute('aria-label')).toBe('Close guided pacer')
  expect(document.body.textContent).toContain('GUIDED, not measured')
  expectSimulationDisclosure()
  await click('Start guided pacing')
  expect(window.breathebreak.recordLiveTestEvent).toHaveBeenCalledWith({event:'pacer-start'})
  await advance(48_000)
  expect(document.querySelector('.pacer-overlay')?.getAttribute('data-pacer-status')).toBe('complete')
  expect(sessionRecorder.guidedCompletions.size).toBe(1)
  await click('Close')
  expect(window.breathebreak.recordLiveTestEvent).toHaveBeenCalledWith({event:'pacer-end'})
  expect(document.querySelector('.pacer-overlay')).toBeNull()
  expect(document.activeElement).toBe(opener)

  const ratesAtStop = [...useSession.getState().gatedRates]
  await click('Stop session')
  expect(useSession.getState().phase).toBe('recap')
  await advance(300)
  expect(useSession.getState().recap).toMatchObject({
    receiptKind: 'full',
    sampleCount: ratesAtStop.length,
    source: 'simulation',
    guidedPaceCompleted: true
  })
  expect(Object.isFrozen(useSession.getState().recap)).toBe(true)
  expect(useSession.getState().gatedRates).toEqual([])
  expect(useSession.getState().sample).toBeUndefined()
  expect(sessionRecorder.size).toBe(0)
  expect(document.body.textContent).toContain('Guide pace4s in · 6s out')
  expectSimulationDisclosure()

  await click('Done')
  expect(useSession.getState()).toMatchObject({ phase: 'ready', recap: undefined, gatedRates: [], sample: undefined })
  await advance(300)
  expect(document.body.textContent).toContain('Before you begin')
  expect(button('Start session').disabled).toBe(false)
  expectSimulationDisclosure()

  await click('Start session')
  expect(useSession.getState()).toMatchObject({ phase: 'running', recap: undefined, gatedRates: [], sample: undefined })
  await advance(300)
  expect(sessionRecorder.guidedCompletions.size).toBe(0)
  await click('Stop session')
  expect(useSession.getState().recap).toMatchObject({ sampleCount: 0, guidedPaceCompleted: false })
  await advance(300)
  expect(document.body.textContent).not.toContain('Guided pace completed')
  await click('Done')
  expect(useSession.getState().phase).toBe('ready')
  await advance(300)
}

beforeAll(() => {
  vi.useFakeTimers()
})

beforeEach(() => {
  vi.clearAllTimers()
  vi.setSystemTime(new Date('2026-11-13T12:00:00Z'))
  const values = new Map<string, string>([['breathebreak.guideSeen.v1', 'true']])
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key), clear: () => values.clear() } })
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { configurable: true, value: () => null })
  Object.defineProperty(window, 'breathebreak', { configurable: true, value: { getRuntimeInfo: vi.fn(), getLiveTestConfig: vi.fn().mockResolvedValue({enabled:false,writing:false,runId:''}), beginLiveTestSession:vi.fn(),endLiveTestSession:vi.fn(),copyLiveTestRunReport:vi.fn(),updateLiveTestCounters: vi.fn(), recordLiveTestEvent: vi.fn() } })
  sessionRecorder.clear()
  useSession.setState({ phase: 'welcome', receiptPhase: 'idle', baselineReady: false, consented: false, source: 'smartspectra', cameraId: undefined, sample: undefined, error: undefined, startedAt: undefined, gatedRates: [], recap: undefined })
})

afterEach(() => {
  if (root) act(() => root!.unmount())
  host?.remove()
  root = undefined
  host = undefined
  sessionRecorder.clear()
})

afterAll(() => {
  vi.useRealTimers()
})

describe('complete simulation-only user journey', () => {
  it('completes every state at both target viewports without stale session data', async () => {
    await runJourney(1280, 800)
    await runJourney(1440, 900)
  }, 15_000)
})
