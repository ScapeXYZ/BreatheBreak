import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { GardenCanvas } from './components/GardenCanvas'
import { resolveSelectedCamera } from './signals/cameras'
import { usableBreathingRate } from './signals/gating'
import { SimulationSignalSource } from './signals/simulation'
import { SmartSpectraSignalSource } from './signals/smartspectra'
import type { CameraDevice, SignalSource, SourceKind } from './signals/types'
import { useSession } from './store/session'

const transition = { duration: 0.22 }
export function App(): JSX.Element {
  const state = useSession()
  const sources = useMemo<Record<SourceKind, SignalSource>>(() => ({ simulation: new SimulationSignalSource(), smartspectra: new SmartSpectraSignalSource() }), [])
  const source = sources[state.source]
  const [cameras, setCameras] = useState<CameraDevice[]>([])
  const [cameraMessage, setCameraMessage] = useState('')
  useEffect(() => {
    if (state.source !== 'smartspectra') return
    let current = true
    void source.listCameras().then((available) => {
      if (!current) return
      setCameras(available)
      const selected = resolveSelectedCamera(available, state.cameraId)
      if (state.cameraId && !selected) { state.setCamera(undefined); setCameraMessage('Your previous camera is not connected. Select an available camera to continue.') }
      else if (!state.cameraId && selected) state.setCamera(selected)
    }).catch(() => setCameraMessage('Cameras could not be listed. Check system permissions and try again.'))
    return () => { current = false }
  }, [source, state.source])
  useEffect(() => {
    const cleanup = (): void => { void sources.smartspectra.stop(); void sources.simulation.stop() }
    window.addEventListener('beforeunload', cleanup)
    return () => { window.removeEventListener('beforeunload', cleanup); cleanup() }
  }, [sources])
  const start = async (): Promise<void> => {
    if (!state.consented || !source.available || (state.source === 'smartspectra' && !state.cameraId)) return
    state.begin()
    try {
      await source.start((sample) => useSession.getState().receive(sample, usableBreathingRate(sample)), {
        cameraId: state.cameraId,
        onStatus: (status) => status === 'reconnecting' ? useSession.getState().reconnecting() : useSession.getState().running(),
        onFatalError: (message) => useSession.getState().fail(message)
      })
      useSession.getState().running()
    } catch (error) { await source.stop(); useSession.getState().fail(error instanceof Error ? error.message : 'Unable to start session') }
  }
  const stop = async (): Promise<void> => {
    state.stopping()
    try { await source.stop(); useSession.getState().finish() } catch { useSession.getState().fail('Unable to stop the session cleanly.') }
  }
  const isSimulation = state.source === 'simulation'
  const rate = usableBreathingRate(state.sample ?? { timestampMs: 0, quality: { kind: 'warming' } })
  const canStart = state.consented && source.available && (isSimulation || Boolean(state.cameraId))
  const live = (['starting', 'running', 'reconnecting', 'stopping'] as const).includes(state.phase as 'starting')
  return <main className={isSimulation ? 'app app--simulation' : 'app'}>
    {isSimulation && <div className="simulation-disclosure">DEV SIMULATION · SYNTHETIC DATA · NOT DEMO EVIDENCE</div>}
    <header className="app-bar"><div className="brand">BreatheBreak</div><div className="privacy-note">Private by design, video is not recorded</div></header>
    <div className="app-stage"><AnimatePresence mode="wait">
      {(state.phase === 'welcome' || state.phase === 'ready') && <motion.section key="welcome" className="welcome-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition}>
        <div className="welcome-copy"><h1>Take a quieter breath.</h1><p className="welcome-lede">A consent-first breathing visualization. Your camera remains off until you choose a camera, consent, and click Start session.</p><div className="privacy-rule"><span>No recording</span><span>On-device metrics</span><span>You choose when to begin</span></div></div>
        <div className="consent-panel glass-panel"><h2>Welcome / Consent</h2><p className="panel-copy">BreatheBreak does not record camera video. A live SDK session processes frames only after your explicit action.</p>
          <label className="consent-check"><input type="checkbox" checked={state.consented} onChange={(event) => state.setConsent(event.target.checked)}/><span>I consent to camera processing when I press Start.</span></label>
          <label className="field-label">Signal source<select className="field" value={state.source} onChange={(event) => state.setSource(event.target.value as SourceKind)}><option value="smartspectra">SmartSpectra SDK</option><option value="simulation">DEV SIMULATION: synthetic</option></select></label>
          {!isSimulation && <label className="field-label">Camera<select className="field" value={state.cameraId ?? ''} onChange={(event) => { state.setCamera(event.target.value || undefined); setCameraMessage('') }}><option value="">Select a camera</option>{cameras.map((camera) => <option key={camera.id} value={camera.id}>{camera.label}</option>)}</select></label>}
          {cameraMessage && <p className="field-message" role="status">{cameraMessage}</p>}
          {!source.available && !isSimulation && <p className="field-message" role="status">SDK key not configured. Add it to your ignored local .env file, then restart.</p>}
          <button className="button button--primary" disabled={!canStart} onClick={() => void start()}>Start session</button>
        </div>
      </motion.section>}
      {live && <motion.section key="live" className="session-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition}>
        <div className="garden-panel"><GardenCanvas chest={state.sample?.chestTrace} rate={rate} active={state.phase === 'running' || state.phase === 'reconnecting'} /><div className="garden-caption">Let the bloom follow your natural rhythm.</div></div>
        <aside className="session-panel glass-panel"><div className="session-heading"><p className="live-state" role="status">{state.phase === 'reconnecting' ? 'Reconnecting' : 'Live session'}</p><h2>Follow the bloom</h2></div>
          <div className="rate-block"><div className="rate-value">{rate?.toFixed(1) ?? '—'}</div><p>breaths / minute</p><p className="supporting">Shown only after warm-up with stable quality.</p></div>
          <dl className="signal-list"><div><dt>Signal</dt><dd>{state.sample?.quality.message ?? state.sample?.quality.kind ?? 'starting'}</dd></div><div><dt>Abdomen trace</dt><dd>{state.sample?.abdomenTrace === undefined ? 'optional / unavailable' : 'available'}</dd></div></dl>
          <p className="camera-indicator" role="status">{isSimulation ? 'Simulation running' : 'Camera active'}</p>
          <button className="button button--secondary" disabled={state.phase === 'stopping'} onClick={() => void stop()}>Stop session</button>
        </aside>
      </motion.section>}
      {state.phase === 'recap' && <motion.section key="recap" className="recap-screen glass-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={transition}>
        <div className="recap-copy"><div><h2>Session recap</h2><p className="recap-line">A small pause, complete.</p></div><p>Your breathing session ended cleanly.</p></div>
        <div className="stats"><Stat label="Duration" value={String(state.recap?.durationSeconds ?? 0) + 's'}/><Stat label="Stable average" value={state.recap?.averageBreathingRate?.toFixed(1) ?? '—'}/><Stat label="Stable samples" value={String(state.recap?.sampleCount ?? 0)}/></div>
        <p className="recap-source">Source: {state.recap?.source === 'simulation' ? 'DEV SIMULATION: synthetic, not evidence' : 'SmartSpectra'}</p>
        <button className="button button--primary recap-action" onClick={state.reset}>Done</button>
      </motion.section>}
      {state.phase === 'error' && <motion.section key="error" className="error-screen glass-panel"><h2>Session could not continue</h2><p>{state.error}</p><button className="button button--secondary" onClick={state.reset}>Return</button></motion.section>}
    </AnimatePresence></div>
  </main>
}
function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return <div className="stat"><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>
}
