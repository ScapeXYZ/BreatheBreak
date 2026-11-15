import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from '../../src/renderer/src/App'
import { useSession } from '../../src/renderer/src/store/session'
import '../../src/renderer/src/styles.css'

Object.defineProperty(window, 'breathebreak', { value: {
  getRuntimeInfo: async () => ({ platform: 'screenshot-harness', version: 'offline' }),
  getLiveTestConfig: async () => ({ enabled: false, writing: false, runId: '' }),
  beginLiveTestSession: async () => undefined,
  endLiveTestSession: async () => undefined,
  copyLiveTestRunReport: async () => false,
  updateLiveTestCounters: () => {},
  recordLiveTestEvent: () => {}
} })
const fixture = window.location.hash.slice(1)
if (fixture !== 'onboarding') localStorage.setItem('breathebreak.guideSeen.v1', 'true')
const trace = Array.from({ length: 48 }, (_, index) => Math.sin(index / 4) * .35 + Math.cos(index / 9) * .08)
const recapBase = { durationSeconds: 83, source: 'simulation' as const, guidedPaceCompleted: true, acceptedRateSampleCount: 4, uniqueRateSampleCount: 7, guideInhaleSeconds: 4, guideExhaleSeconds: 6, chestTrace: trace }
if (fixture === 'live') useSession.setState({ source: 'simulation', consented: true, phase: 'running', receiptPhase: 'baseline', baselineReady: false, baselineAcceptedCount: 2, startedAt: Date.now() - 28_000, acceptedRateSampleCount: 2, uniqueRateSampleCount: 5, sample: { timestampMs: Date.now(), quality: { kind: 'ok' }, chestTrace: .42, breathingRate: { value: 11, confidence: 80, stable: true, timestampMs: Date.now() } }, gatedRates: [10, 11] })
else if (fixture === 'full-real') useSession.setState({ source: 'smartspectra', phase: 'recap', recap: Object.freeze({ ...recapBase, source: 'smartspectra', receiptKind: 'full', receiptSufficient: true, sampleCount: 5, before: 12.4, after: 9.8, change: -2.6, baselineAcceptedCount: 2, guidedAcceptedCount: 3 }) })
else if (fixture === 'full') useSession.setState({ source: 'simulation', phase: 'recap', recap: Object.freeze({ ...recapBase, receiptKind: 'full', receiptSufficient: true, sampleCount: 5, before: 12.4, after: 9.8, change: -2.6, baselineAcceptedCount: 2, guidedAcceptedCount: 3 }) })
else if (fixture === 'partial') useSession.setState({ source: 'simulation', phase: 'recap', recap: Object.freeze({ ...recapBase, receiptKind: 'partial', receiptSufficient: false, sampleCount: 3, median: 10.8, minimum: 9.9, maximum: 12.1, baselineAcceptedCount: 1, guidedAcceptedCount: 2 }) })
else if (fixture === 'insufficient') useSession.setState({ source: 'simulation', phase: 'recap', recap: Object.freeze({ ...recapBase, receiptKind: 'insufficient', receiptSufficient: false, sampleCount: 1, acceptedRateSampleCount: 1, baselineAcceptedCount: 1, guidedAcceptedCount: 0 }) })
else if (fixture === 'interrupted') useSession.setState({ source: 'simulation', phase: 'recap', recap: Object.freeze({ ...recapBase, receiptKind: 'interrupted', receiptSufficient: false, pacerInterrupted: true, sampleCount: 4, baselineAcceptedCount: 2, guidedAcceptedCount: 2 }) })
else useSession.setState({ source: 'simulation', consented: false, phase: 'welcome' })
if (window.location.hash === '#baseline-cap') {
  const unsubscribe = useSession.subscribe((state) => {
    if (state.phase === 'running' && !state.baselineReady) {
      state.markBaselineReady('cap')
      unsubscribe()
    }
  })
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
