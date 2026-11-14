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
useSession.setState({ source: 'simulation', consented: false, phase: 'welcome' })
if (window.location.hash === '#baseline-cap') {
  const unsubscribe = useSession.subscribe((state) => {
    if (state.phase === 'running' && !state.baselineReady) {
      state.markBaselineReady('cap')
      unsubscribe()
    }
  })
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
