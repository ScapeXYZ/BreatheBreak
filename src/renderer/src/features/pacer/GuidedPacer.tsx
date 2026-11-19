import { useEffect, useRef, useState } from 'react'
import { PACE_MS, PacerController, systemPacerClock, type PacerClock, type PacerSnapshot } from './pacer'

export const INITIAL_PACER_SNAPSHOT: Readonly<PacerSnapshot> = { status: 'ready', segment: 'settle', breathPhase: 'inhale', countdown: 3, paceElapsedMs: 0 }
const focusableSelector = 'button:not(:disabled),select:not(:disabled),input:not(:disabled),textarea:not(:disabled),[href],[tabindex]:not([tabindex="-1"])'
export function trapTabAtBoundary(shell: HTMLElement, shiftKey: boolean): boolean { const focusable = [...shell.querySelectorAll<HTMLElement>(focusableSelector)]; if (!focusable.length) return true; const first = focusable[0], last = focusable[focusable.length - 1], active = document.activeElement; if (shiftKey && (active === first || !shell.contains(active))) { last.focus(); return true } if (!shiftKey && active === last) { first.focus(); return true } return false }

type GuidedPacerProps = {
  open: boolean
  inline?: boolean
  onClose(): void
  onComplete(inhaleSeconds: number, exhaleSeconds: number): void
  onSnapshot?(snapshot: Readonly<PacerSnapshot>): void
  onStart?(): void
  onEnd?(): void
  onPause?(): void
  onResume?(): void
  onInterrupted?(gapMs: number): void
  clock?: PacerClock
}

export function GuidedPacer({ open, inline = false, onClose, onComplete, onSnapshot = () => {}, onStart = () => {}, onEnd = () => {}, onPause = () => {}, onResume = () => {}, onInterrupted = () => {}, clock = systemPacerClock }: GuidedPacerProps): JSX.Element | null {
  const [inhale, setInhale] = useState(4), [exhale, setExhale] = useState(6), [snapshot, setSnapshot] = useState<Readonly<PacerSnapshot>>(INITIAL_PACER_SNAPSHOT)
  const controller = useRef<PacerController>(), shellRef = useRef<HTMLDivElement>(null), openerRef = useRef<HTMLElement | null>(null), active = useRef(false), onEndRef = useRef(onEnd), onSnapshotRef = useRef(onSnapshot)
  onEndRef.current = onEnd
  onSnapshotRef.current = onSnapshot
  const publishSnapshot = (next: PacerSnapshot): void => { const readonly: Readonly<PacerSnapshot> = { ...next }; setSnapshot(readonly); onSnapshotRef.current(readonly) }
  const endExercise = (): void => { if (active.current) { active.current = false; onEndRef.current() } controller.current?.dispose(); controller.current = undefined }
  const close = (): void => { endExercise(); onClose() }
  useEffect(() => () => endExercise(), [])
  useEffect(() => { if (!open) { endExercise(); setSnapshot(INITIAL_PACER_SNAPSHOT); onSnapshotRef.current(INITIAL_PACER_SNAPSHOT) } }, [open])
  useEffect(() => {
    if (!open || inline) return
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const background = [...document.querySelectorAll<HTMLElement>('.app > :not(.pacer-overlay)')]
    const inertBefore = background.map(node => node.inert)
    background.forEach(node => { node.inert = true })
    shellRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus()
    return () => { background.forEach((node, index) => { node.inert = inertBefore[index] }); const opener = openerRef.current; if (opener?.isConnected && !opener.closest('[inert]')) opener.focus() }
  }, [open, inline])
  useEffect(() => {
    if (!open || inline) return
    const key = (event: KeyboardEvent): void => { if (event.key === 'Escape') { event.preventDefault(); close(); return } if (event.key === 'Tab') { if (shellRef.current && trapTabAtBoundary(shellRef.current, event.shiftKey)) event.preventDefault(); return } const target = event.target as HTMLElement | null; if (target?.matches('input, select, textarea, button, [contenteditable=true]')) return; if (event.code === 'Space' && (snapshot.status === 'running' || snapshot.status === 'paused')) { event.preventDefault(); controller.current?.togglePause() } }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [open, inline, onClose, snapshot.status])
  if (!open) return null

  const start = (): void => { active.current = true; onStart(); const next = new PacerController(clock, inhale, exhale, publishSnapshot, () => { active.current = false; onComplete(inhale, exhale); onEndRef.current() }, gapMs => { active.current = false; onInterrupted(gapMs) }); controller.current = next; next.start() }
  const toggle = (): void => { if (snapshot.status === 'running') onPause(); else if (snapshot.status === 'paused') onResume(); controller.current?.togglePause() }
  const phase = snapshot.status === 'interrupted' ? 'Interrupted' : snapshot.segment === 'settle' ? 'Settle' : snapshot.segment === 'finish' ? 'Finish' : snapshot.breathPhase === 'inhale' ? 'Breathe in' : 'Breathe out'
  const paceSeconds = PACE_MS / 1000
  const settings = <details className="pace-settings"><summary>Pace settings</summary><div className="pacer-settings"><label>Inhale<select value={inhale} onChange={event => setInhale(Number(event.target.value))}>{[3, 4, 5, 6, 7, 8].map(value => <option key={value} value={value}>{value} seconds</option>)}</select></label><label>Exhale<select value={exhale} onChange={event => setExhale(Number(event.target.value))}>{[3, 4, 5, 6, 7, 8].map(value => <option key={value} value={value}>{value} seconds</option>)}</select></label><p>No hold phase</p></div></details>

  if (inline) return <section className="guided-inline-card" aria-labelledby="guided-inline-title" data-pacer-status={snapshot.status} data-pacer-phase={snapshot.breathPhase}>
    <div><p className="guided-label">GUIDED, not measured</p><h3 id="guided-inline-title">{snapshot.status === 'ready' ? 'Start guided minute' : phase}</h3></div>
    {snapshot.status === 'ready' ? <><p>Follow the 45-second guide when you are ready.</p>{settings}<button className="button button--primary" onClick={start}>Start guided minute</button></> : <><p className="guided-inline-status" aria-live="polite">{snapshot.status === 'complete' ? 'Guided breathing complete.' : snapshot.status === 'interrupted' ? 'The guide was interrupted.' : `${phase}: ${snapshot.countdown} seconds`}</p><div className="pacer-actions">{snapshot.status !== 'complete' && snapshot.status !== 'interrupted' && <button className="button button--secondary" onClick={toggle}>{snapshot.status === 'paused' ? 'Resume' : 'Pause'}</button>}<button className="button button--secondary" onClick={close}>{snapshot.status === 'complete' || snapshot.status === 'interrupted' ? 'Close' : 'End guide'}</button></div></>}
  </section>

  const trapFocus = (event: React.KeyboardEvent<HTMLElement>): void => { if (event.key === 'Tab' && shellRef.current && trapTabAtBoundary(shellRef.current, event.shiftKey)) event.preventDefault() }
  return <section className="pacer-overlay" role="dialog" aria-modal="true" aria-labelledby="pacer-title" aria-describedby="pacer-note" data-pacer-status={snapshot.status} data-pacer-phase={snapshot.breathPhase} onKeyDown={trapFocus}>
    <div className="pacer-shell" ref={shellRef}><header className="pacer-header"><div><h2 id="pacer-title">Breathing pace</h2><p className="guided-label">GUIDED, not measured</p></div><button className="icon-button" onClick={close} aria-label="Close guided pacer">&times;</button></header>
      <nav className="pacer-progress" aria-label="Guided pace progress"><span className={snapshot.segment === 'settle' ? 'current' : ''}>Settle</span><span className={snapshot.segment === 'pace' ? 'current' : ''}>Pace &middot; {paceSeconds} seconds</span><span className={snapshot.segment === 'finish' ? 'current' : ''}>Finish</span></nav>
      <div className="pacer-visual" aria-live="polite"><div className="pacer-ring pacer-ring--outer" /><div className="pacer-ring pacer-ring--middle" /><div className="pacer-ring pacer-ring--inner" /><div className="pacer-readout"><p className="pacer-instruction">{snapshot.status === 'paused' ? 'Paused' : phase}</p><strong>{snapshot.status === 'complete' ? 'Done' : snapshot.countdown}</strong>{snapshot.segment === 'pace' && <p>{Math.min(paceSeconds, Math.floor(snapshot.paceElapsedMs / 1000))} / {paceSeconds} seconds</p>}</div></div>
      {snapshot.status === 'ready' ? <>{settings}<button className="button button--primary pacer-primary" onClick={start}>Start guided pacing</button></> : <div className="pacer-actions">{snapshot.status !== 'complete' && snapshot.status !== 'interrupted' && <button className="button button--secondary" onClick={toggle}>{snapshot.status === 'paused' ? 'Resume' : 'Pause'}</button>}<button className="button button--secondary" onClick={close}>{snapshot.status === 'complete' || snapshot.status === 'interrupted' ? 'Close' : 'End guide'}</button></div>}
      <p className="pacer-note" id="pacer-note">Follow the guide at a pace that feels comfortable. Stop whenever you choose.</p></div>
  </section>
}
