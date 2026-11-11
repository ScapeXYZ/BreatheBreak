import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'
import { GardenCanvas } from './components/GardenCanvas'
import { usableBreathingRate } from './signals/gating'
import { SimulationSignalSource } from './signals/simulation'
import { SmartSpectraSignalSource } from './signals/smartspectra'
import type { SignalSource } from './signals/types'
import { useSession } from './store/session'

export function App(): JSX.Element {
  const state = useSession()
  const sources = useMemo<Record<string, SignalSource>>(() => ({ simulation: new SimulationSignalSource(), smartspectra: new SmartSpectraSignalSource() }), [])
  const source = sources[state.source]
  const start = async (): Promise<void> => {
    if (!state.consented || !source.available) return
    state.begin()
    try { await source.start((sample) => useSession.getState().receive(sample, usableBreathingRate(sample))); useSession.getState().running() }
    catch (error) { await source.stop(); useSession.getState().fail(error instanceof Error ? error.message : 'Unable to start session') }
  }
  const stop = async (): Promise<void> => { state.stopping(); try { await source.stop(); useSession.getState().finish() } catch (error) { useSession.getState().fail(error instanceof Error ? error.message : 'Unable to stop session') } }
  const isSimulation = state.source === 'simulation'
  return <main className="min-h-screen bg-night text-moon">
    {isSimulation && <div className="fixed inset-x-0 top-0 z-50 bg-amber-300 py-2 text-center text-xs font-black tracking-[.28em] text-slate-950">DEV SIMULATION · SYNTHETIC DATA · NOT DEMO EVIDENCE</div>}
    <div className="mx-auto flex min-h-screen max-w-6xl items-center px-8 pb-10 pt-20">
      <AnimatePresence mode="wait">
        {(state.phase === 'welcome' || state.phase === 'ready') && <motion.section key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid w-full grid-cols-2 gap-16">
          <div><p className="mb-4 text-sm uppercase tracking-[.3em] text-moss">A quiet pause</p><h1 className="text-7xl font-light leading-none">Breathe<br/>with the garden.</h1><p className="mt-8 max-w-md text-lg text-slate-300">A consent-first breathing visualization. The camera never starts until you explicitly begin a configured live source.</p></div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl"><h2 className="text-2xl">Welcome / Consent</h2><p className="mt-3 text-sm text-slate-300">This development build uses synthetic signals by default. No camera frames are recorded or uploaded.</p>
            <label className="mt-8 flex gap-3"><input type="checkbox" checked={state.consented} onChange={(e) => state.setConsent(e.target.checked)}/><span>I consent to start a session when I press Start.</span></label>
            <label className="mt-6 block text-sm">Signal source<select className="mt-2 w-full rounded-xl bg-slate-900 p-3" value={state.source} onChange={(e) => state.setSource(e.target.value as 'simulation' | 'smartspectra')}><option value="simulation">DEV SIMULATION</option><option value="smartspectra" disabled>SmartSpectra — integration incomplete</option></select></label>
            <button className="mt-8 w-full rounded-full bg-moon px-6 py-3 font-semibold text-night disabled:opacity-30" disabled={!state.consented || !source.available} onClick={() => void start()}>Start session</button>
          </div>
        </motion.section>}
        {(['starting','running','stopping'] as const).includes(state.phase as never) && <motion.section key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid h-[680px] w-full grid-cols-[1fr_320px] overflow-hidden rounded-[2rem] border border-white/10 bg-black/20">
          <GardenCanvas chest={state.sample?.chestTrace} rate={usableBreathingRate(state.sample ?? { timestampMs: 0, quality: { kind: 'warming' } })} active={state.phase === 'running'} />
          <aside className="border-l border-white/10 p-8"><p className="text-xs uppercase tracking-[.25em] text-moss">Live session</p><h2 className="mt-4 text-3xl">Follow the bloom</h2><div className="mt-12 text-6xl font-light">{usableBreathingRate(state.sample ?? { timestampMs: 0, quality: { kind: 'warming' } })?.toFixed(1) ?? '—'}</div><p className="text-sm text-slate-400">breaths / minute · shown only when source quality is stable</p><p className="mt-8 text-sm">Signal: {state.sample?.quality.message ?? state.sample?.quality.kind ?? 'starting'}</p><p className="mt-2 text-sm text-slate-400">Abdomen trace: {state.sample?.abdomenTrace === undefined ? 'optional / unavailable' : 'available'}</p><button className="mt-12 w-full rounded-full border border-white/30 px-6 py-3 disabled:opacity-40" disabled={state.phase !== 'running'} onClick={() => void stop()}>Stop session</button></aside>
        </motion.section>}
        {state.phase === 'recap' && <motion.section key="recap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-12 text-center"><p className="text-sm uppercase tracking-[.3em] text-moss">Session recap</p><h2 className="mt-4 text-5xl font-light">A small pause, complete.</h2><div className="mt-10 grid grid-cols-3 gap-4"><Stat label="Duration" value={`${state.recap?.durationSeconds ?? 0}s`}/><Stat label="Stable average" value={state.recap?.averageBreathingRate?.toFixed(1) ?? '—'}/><Stat label="Stable samples" value={`${state.recap?.sampleCount ?? 0}`}/></div><p className="mt-8 text-sm text-amber-200">Source: {state.recap?.source === 'simulation' ? 'DEV SIMULATION — synthetic, not evidence' : 'SmartSpectra'}</p><button className="mt-8 rounded-full bg-moon px-8 py-3 text-night" onClick={state.reset}>Done</button></motion.section>}
        {state.phase === 'error' && <motion.section key="error" className="mx-auto max-w-xl rounded-3xl border border-red-300/30 bg-red-950/20 p-10"><h2 className="text-3xl">Session could not continue</h2><p className="mt-4 text-red-100">{state.error}</p><button className="mt-8 rounded-full border px-6 py-3" onClick={state.reset}>Return</button></motion.section>}
      </AnimatePresence>
    </div>
  </main>
}

function Stat({ label, value }: { label: string; value: string }): JSX.Element { return <div className="rounded-2xl bg-black/20 p-5"><div className="text-3xl">{value}</div><div className="mt-2 text-xs uppercase tracking-wider text-slate-400">{label}</div></div> }
