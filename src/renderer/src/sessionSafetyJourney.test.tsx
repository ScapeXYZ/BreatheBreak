// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App, SUSPEND_LOCK_MESSAGE } from './App'
import type { SignalListener, SignalSource } from './signals/types'
import { useSession } from './store/session'
import type { ForcedSessionStopReason } from '../../main/sessionSafety'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('forced session safety journey', () => {
  const stop = vi.fn(async () => {})
  let forcedStop: ((reason: ForcedSessionStopReason) => void) | undefined
  let host: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  const source: SignalSource = {
    kind: 'smartspectra', label: 'fake real source', available: true,
    listCameras: async () => [{ id: 'camo', label: 'Camo' }],
    start: async (_listener: SignalListener) => {},
    stop
  }

  beforeEach(() => {
    stop.mockClear(); forcedStop = undefined
    useSession.setState({ phase: 'ready', receiptPhase: 'idle', consented: true, source: 'smartspectra', cameraId: 'camo', baselineReady: false, baselineAcceptedCount: 0, pacerInterrupted: false, uniqueRateSampleCount: 0, acceptedRateSampleCount: 0, gatedRates: [] })
    Object.defineProperty(window, 'breathebreak', { configurable: true, value: {
      getLiveTestConfig: vi.fn().mockResolvedValue({ enabled: false, writing: false, runId: '' }),
      setSessionActive: vi.fn(), recordLiveTestEvent: vi.fn(),
      onForcedSessionStop: vi.fn((listener: (reason: ForcedSessionStopReason) => void) => { forcedStop = listener; return () => { forcedStop = undefined } })
    } })
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { configurable: true, value: () => null })
    host = document.createElement('div'); document.body.append(host); root = createRoot(host)
  })

  afterEach(() => { act(() => root.unmount()); host.remove() })

  async function start(): Promise<void> {
    await act(async () => { root.render(<App sourceOverrides={{ smartspectra: source }} />); await Promise.resolve() })
    const revealButton = [...document.querySelectorAll('button')].find(button => button.textContent === 'Start a reset')!
    act(() => revealButton.click())
    act(() => document.querySelector<HTMLInputElement>('.consent-check input')!.click())
    const startButton = [...document.querySelectorAll('button')].find(button => button.textContent === 'Start session')!
    await act(async () => { startButton.click(); await new Promise(resolve => setTimeout(resolve, 300)) })
    expect(document.body.textContent).toContain('Session limit: 3:00 remaining')
  }

  it('releases the real-source camera and shows the required sleep/lock message', async () => {
    await start()
    await act(async () => { forcedStop?.('suspend-or-lock'); await Promise.resolve() })
    expect(stop).toHaveBeenCalled()
    expect(useSession.getState()).toMatchObject({ phase: 'error', error: SUSPEND_LOCK_MESSAGE })
    expect(window.breathebreak.setSessionActive).toHaveBeenCalledWith(false)
  })

  it('releases the real-source camera on the three-minute forced stop', async () => {
    await start()
    await act(async () => { forcedStop?.('maximum-duration'); await Promise.resolve() })
    expect(stop).toHaveBeenCalled()
    expect(useSession.getState().phase).toBe('recap')
    expect(window.breathebreak.setSessionActive).toHaveBeenCalledWith(false)
  })
})
