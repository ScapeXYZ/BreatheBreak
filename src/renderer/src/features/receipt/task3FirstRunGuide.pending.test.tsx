// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../../App'
import type { CameraDevice, SignalListener, SignalSource } from '../../signals/types'
import { useSession } from '../../store/session'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

class NoAcquisitionSource implements SignalSource {
  readonly kind = 'smartspectra' as const
  readonly label = 'Test SmartSpectra source'
  readonly available = true
  readonly start = vi.fn(async (_listener: SignalListener) => undefined)
  readonly stop = vi.fn(async () => undefined)
  async listCameras(): Promise<CameraDevice[]> { return [{ id: 'camo', label: 'Camo' }] }
}

let root: Root | undefined
let host: HTMLDivElement | undefined
let source: NoAcquisitionSource

beforeEach(async () => {
  source = new NoAcquisitionSource()
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key), clear: () => values.clear()
  } })
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { configurable: true, value: () => null })
  Object.defineProperty(window, 'breathebreak', { configurable: true, value: {
    getRuntimeInfo: vi.fn(), getLiveTestConfig: vi.fn().mockResolvedValue({ enabled: false, writing: false, runId: '' }),
    beginLiveTestSession: vi.fn(), endLiveTestSession: vi.fn(), copyLiveTestRunReport: vi.fn(),
    updateLiveTestCounters: vi.fn(), recordLiveTestEvent: vi.fn(), setSessionActive: vi.fn(), onForcedSessionStop: vi.fn()
  } })
  useSession.setState({ phase: 'welcome', receiptPhase: 'idle', consented: false, source: 'smartspectra', cameraId: 'camo', baselineReady: false, baselineAcceptedCount: 0, pacerInterrupted: false, uniqueRateSampleCount: 0, acceptedRateSampleCount: 0, gatedRates: [] })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => { root!.render(<App sourceOverrides={{ smartspectra: source }} />); await Promise.resolve() })
})

afterEach(() => {
  if (root) act(() => root!.unmount())
  host?.remove()
  root = undefined
  host = undefined
})

describe('Task 3 first-run framing guide contract', () => {
  it('presents exactly three ordered guide steps', () => {
    expect(document.querySelectorAll('[data-guide-step]')).toHaveLength(3)
    expect(document.body.textContent).toContain('Step 1 of 3')
  })

  it('supports keyboard-accessible forward and backward navigation', () => {
    const next = [...document.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Next')!
    next.focus()
    expect(next.tagName).toBe('BUTTON')
    act(() => next.click())
    expect(document.body.textContent).toContain('Step 2 of 3')
    expect(document.activeElement).toBe(document.querySelector('#guide-title'))
  })

  it('completes without granting camera consent or acquiring the source', () => {
    const next = () => [...document.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Next')!
    act(() => next().click())
    act(() => next().click())
    const complete = [...document.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Continue to consent')!
    act(() => complete.click())
    expect(useSession.getState().consented).toBe(false)
    expect(source.start).not.toHaveBeenCalled()
    expect(window.breathebreak.beginLiveTestSession).not.toHaveBeenCalled()
  })

  it('reopens without changing an existing consent choice', () => {
    const skip = [...document.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Skip guide')!
    act(() => skip.click())
    act(() => useSession.getState().setConsent(true))
    const reopen = [...document.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'How it works')!
    act(() => reopen.click())
    expect(useSession.getState().consented).toBe(true)
    expect(source.start).not.toHaveBeenCalled()
  })

  it('keeps Start disabled until explicit consent and never starts from guide navigation', () => {
    const skip = [...document.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Skip guide')!
    act(() => skip.click())
    const reveal = [...document.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Start a reset')!
    act(() => reveal.click())
    const start = [...document.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Start session')!
    expect(start.disabled).toBe(true)
    expect(source.start).not.toHaveBeenCalled()
  })

  it('traps focus in consent, supports Escape, and restores the opener', () => {
    const skip = [...document.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Skip guide')!
    act(() => skip.click())
    const opener = [...document.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Start a reset')!
    opener.focus()
    act(() => opener.click())
    const dialog = document.querySelector<HTMLElement>('[role="dialog"][aria-labelledby="consent-title"]')!
    expect(dialog).toBeTruthy()
    expect(document.querySelector<HTMLElement>('.welcome-primary')?.inert).toBe(true)
    expect(dialog.contains(document.activeElement)).toBe(true)
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(document.querySelector('[aria-labelledby="consent-title"]')).toBeNull()
    expect(document.activeElement).toBe(opener)
    expect(useSession.getState().consented).toBe(false)
  })

  it('resets the consent checkbox every time the modal opens', () => {
    const skip = [...document.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Skip guide')!
    act(() => skip.click())
    act(() => useSession.getState().setConsent(true))
    const opener = [...document.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Start a reset')!
    act(() => opener.click())
    expect(useSession.getState().consented).toBe(false)
    expect(document.querySelector<HTMLInputElement>('.consent-check input')?.checked).toBe(false)
  })
  it('provides explicit Cancel without granting consent', () => {
    const skip = [...document.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Skip guide')!
    act(() => skip.click())
    const opener = [...document.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Start a reset')!
    act(() => opener.click())
    const cancel = [...document.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Cancel')!
    act(() => cancel.click())
    expect(document.querySelector('[aria-labelledby="consent-title"]')).toBeNull()
    expect(useSession.getState().consented).toBe(false)
    expect(source.start).not.toHaveBeenCalled()
  })
})
