import { create } from 'zustand'
import type { SignalSample, SourceKind } from '../signals/types'

export type SessionPhase = 'welcome' | 'ready' | 'starting' | 'running' | 'stopping' | 'recap' | 'error'
type Recap = { durationSeconds: number; averageBreathingRate?: number; sampleCount: number; source: SourceKind }
type SessionState = {
  phase: SessionPhase; consented: boolean; source: SourceKind; sample?: SignalSample; error?: string; startedAt?: number; gatedRates: number[]; recap?: Recap
  setConsent(value: boolean): void; setSource(source: SourceKind): void; begin(): void; running(): void; receive(sample: SignalSample, gatedRate?: number): void; stopping(): void; finish(): void; fail(message: string): void; reset(): void
}

export const useSession = create<SessionState>((set) => ({
  phase: 'welcome', consented: false, source: 'simulation', gatedRates: [],
  setConsent: (consented) => set({ consented, phase: consented ? 'ready' : 'welcome' }),
  setSource: (source) => set({ source }),
  begin: () => set({ phase: 'starting', error: undefined, startedAt: Date.now(), gatedRates: [], sample: undefined }),
  running: () => set({ phase: 'running' }),
  receive: (sample, rate) => set((state) => ({ sample, gatedRates: rate === undefined ? state.gatedRates : [...state.gatedRates, rate] })),
  stopping: () => set({ phase: 'stopping' }),
  finish: () => set((state) => {
    const rates = state.gatedRates
    return { phase: 'recap', recap: { durationSeconds: Math.max(0, Math.round((Date.now() - (state.startedAt ?? Date.now())) / 1000)), averageBreathingRate: rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : undefined, sampleCount: rates.length, source: state.source } }
  }),
  fail: (error) => set({ phase: 'error', error }),
  reset: () => set({ phase: 'ready', sample: undefined, error: undefined, recap: undefined, gatedRates: [] })
}))
