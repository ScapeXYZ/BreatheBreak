import { create } from 'zustand'
import type { SignalSample, SourceKind } from '../signals/types'

export type SessionPhase = 'welcome' | 'ready' | 'starting' | 'running' | 'reconnecting' | 'stopping' | 'recap' | 'error'
export type Recap = Readonly<{ durationSeconds: number; averageBreathingRate?: number; sampleCount: number; source: SourceKind; guidedPaceCompleted: boolean }>
type FinishOptions = { guidedPaceCompleted?: boolean }
type SessionState = {
  phase: SessionPhase; consented: boolean; source: SourceKind; cameraId?: string; sample?: SignalSample; error?: string; startedAt?: number; gatedRates: number[]; recap?: Recap
  setConsent(value: boolean): void; setSource(source: SourceKind): void; setCamera(cameraId?: string): void; begin(): void; running(): void; reconnecting(): void; receive(sample: SignalSample, gatedRate?: number): void; clearMeasurements(): void; stopping(): void; finish(options?: FinishOptions): void; fail(message: string): void; reset(): void
}

const rememberedCamera = (): string | undefined => typeof localStorage === 'undefined' ? undefined : localStorage.getItem('breathebreak.cameraId') ?? undefined

export const useSession = create<SessionState>((set) => ({
  phase: 'welcome', consented: false, source: 'smartspectra', cameraId: rememberedCamera(), gatedRates: [],
  setConsent: (consented) => set({ consented, phase: consented ? 'ready' : 'welcome' }),
  setSource: (source) => set({ source }),
  setCamera: (cameraId) => { if (typeof localStorage !== 'undefined') { if (cameraId) localStorage.setItem('breathebreak.cameraId', cameraId); else localStorage.removeItem('breathebreak.cameraId') } set({ cameraId }) },
  begin: () => set((state) => state.consented ? { phase: 'starting', error: undefined, startedAt: Date.now(), gatedRates: [], sample: undefined, recap: undefined } : state),
  running: () => set({ phase: 'running' }),
  reconnecting: () => set({ phase: 'reconnecting' }),
  receive: (sample, rate) => set((state) => ({ sample, gatedRates: rate === undefined ? state.gatedRates : [...state.gatedRates, rate] })),
  clearMeasurements: () => set({ sample: undefined, gatedRates: [], recap: undefined }),
  stopping: () => set({ phase: 'stopping' }),
  finish: (options = {}) => set((state) => {
    const rates = state.gatedRates
    const recap = Object.freeze({ durationSeconds: Math.max(0, Math.round((Date.now() - (state.startedAt ?? Date.now())) / 1000)), averageBreathingRate: rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : undefined, sampleCount: rates.length, source: state.source, guidedPaceCompleted: options.guidedPaceCompleted === true })
    return { phase: 'recap', recap, gatedRates: [], sample: undefined, startedAt: undefined }
  }),
  fail: (error) => set({ phase: 'error', error, sample: undefined, recap: undefined, gatedRates: [], startedAt: undefined }),
  reset: () => set({ phase: 'ready', sample: undefined, error: undefined, recap: undefined, gatedRates: [], startedAt: undefined })
}))
