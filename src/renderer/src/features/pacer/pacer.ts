export type PacerBreathPhase = 'inhale' | 'exhale'
export type PacerSegment = 'settle' | 'pace' | 'finish'
export type PacerStatus = 'ready' | 'running' | 'paused' | 'complete'
export type PacerSnapshot = { status: PacerStatus; segment: PacerSegment; breathPhase: PacerBreathPhase; countdown: number; paceElapsedMs: number }
export type PacerClock = { now(): number; setInterval(callback: () => void, milliseconds: number): unknown; clearInterval(id: unknown): void }
const SETTLE_MS = 3000
export const PACE_MS = 45000
export class PacerController {
  private status: PacerStatus = 'ready'; private segment: PacerSegment = 'settle'; private breathPhase: PacerBreathPhase = 'inhale'
  private startedAt = 0; private pausedAt = 0; private pausedTotal = 0; private interval?: unknown
  constructor(private readonly clock: PacerClock, readonly inhaleSeconds = 4, readonly exhaleSeconds = 6, private readonly onChange: (value: PacerSnapshot) => void = () => {}, private readonly onComplete: () => void = () => {}) { if (inhaleSeconds < 3 || inhaleSeconds > 8 || exhaleSeconds < 3 || exhaleSeconds > 8) throw new RangeError('Breathing durations must be between 3 and 8 seconds') }
  snapshot(): PacerSnapshot { const elapsed=this.elapsed(); if(this.status==='ready') return {status:this.status,segment:'settle',breathPhase:'inhale',countdown:3,paceElapsedMs:0}; if(this.status==='complete') return {status:this.status,segment:'finish',breathPhase:this.breathPhase,countdown:0,paceElapsedMs:PACE_MS}; if(elapsed<SETTLE_MS) return {status:this.status,segment:'settle',breathPhase:'inhale',countdown:Math.max(1,Math.ceil((SETTLE_MS-elapsed)/1000)),paceElapsedMs:0}; const paceElapsed=elapsed-SETTLE_MS; const cycle=(this.inhaleSeconds+this.exhaleSeconds)*1000; const position=paceElapsed%cycle; const inhaleMs=this.inhaleSeconds*1000; const phase=position<inhaleMs?'inhale':'exhale'; const remaining=phase==='inhale'?inhaleMs-position:cycle-position; this.breathPhase=phase; return {status:this.status,segment:'pace',breathPhase:phase,countdown:Math.max(1,Math.ceil(remaining/1000)),paceElapsedMs:Math.min(PACE_MS,paceElapsed)} }
  start(): void { if(this.status!=='ready')return; this.status='running';this.startedAt=this.clock.now();this.interval=this.clock.setInterval(()=>this.tick(),100);this.emit() }
  togglePause(): void { if(this.status==='running'){this.status='paused';this.pausedAt=this.clock.now();this.emit()}else if(this.status==='paused'){this.pausedTotal+=this.clock.now()-this.pausedAt;this.status='running';this.emit()} }
  dispose(): void { if(this.interval!==undefined)this.clock.clearInterval(this.interval);this.interval=undefined }
  private elapsed(): number { const end=this.status==='paused'?this.pausedAt:this.clock.now();return Math.max(0,end-this.startedAt-this.pausedTotal) }
  private tick(): void { if(this.status!=='running')return; if(this.elapsed()>=SETTLE_MS+PACE_MS){this.status='complete';this.segment='finish';this.dispose();this.emit();this.onComplete();return}this.emit() }
  private emit(): void { const value=this.snapshot();this.segment=value.segment;this.onChange(value) }
}
export const systemPacerClock: PacerClock = { now:()=>performance.now(), setInterval:(callback,ms)=>window.setInterval(callback,ms), clearInterval:(id)=>window.clearInterval(id as number) }
