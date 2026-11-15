import { create } from 'zustand'
import type { SignalSample, SourceKind } from '../signals/types'
import { advanceReceiptTimeline, RECEIPT_BASELINE_TARGET_READINGS, type ReceiptKind, type ReceiptSummary, type ReceiptTimelinePhase } from '../features/receipt/receipt'

export type SessionPhase = 'welcome' | 'ready' | 'starting' | 'running' | 'reconnecting' | 'stopping' | 'recap' | 'error'
export type Recap = Readonly<{
  durationSeconds: number
  sampleCount: number
  uniqueRateSampleCount?: number
  acceptedRateSampleCount?: number
  baselineAcceptedCount?: number
  guidedAcceptedCount?: number
  source: SourceKind
  guidedPaceCompleted: boolean
  pacerInterrupted?: boolean
  receiptSufficient?: boolean
  receiptKind?: ReceiptKind
  before?: number
  after?: number
  change?: number
  median?: number
  minimum?: number
  maximum?: number
  guideInhaleSeconds?: number
  guideExhaleSeconds?: number
  chestTrace?: readonly number[]
}>
type FinishOptions = { guidedPaceCompleted?: boolean; receipt: ReceiptSummary; guidePace?: Readonly<{inhaleSeconds:number;exhaleSeconds:number}>; chestTrace?:readonly number[] }
type SessionState = {
  phase: SessionPhase; receiptPhase: ReceiptTimelinePhase; baselineReady: boolean; baselineAcceptedCount: number; baselineCompletionReason?: 'count' | 'cap'; pacerInterrupted:boolean; uniqueRateSampleCount: number; acceptedRateSampleCount: number; consented: boolean; source: SourceKind; cameraId?: string; sample?: SignalSample; error?: string; startedAt?: number; gatedRates: number[]; recap?: Recap
  setConsent(value: boolean): void; setSource(source: SourceKind): void; setCamera(cameraId?: string): void; begin(): void; running(): void; reconnecting(): void; markBaselineReady(reason: 'count' | 'cap'): void; startGuided(): void; endGuided(): void; interruptGuided():void; receiveSample(sample: SignalSample): void; observeRateSample(accepted:boolean):void; receiveRate(gatedRate: number): void; clearMeasurements(): void; stopping(): void; finish(options: FinishOptions): void; fail(message: string): void; reset(): void
}

const rememberedCamera = (): string | undefined => typeof localStorage === 'undefined' ? undefined : localStorage.getItem('breathebreak.cameraId') ?? undefined

export const useSession = create<SessionState>((set) => ({
  phase: 'welcome', receiptPhase: 'idle', baselineReady: false, baselineAcceptedCount: 0, pacerInterrupted:false, uniqueRateSampleCount: 0, acceptedRateSampleCount: 0, consented: false, source: 'smartspectra', cameraId: rememberedCamera(), gatedRates: [],
  setConsent: (consented) => set({ consented, phase: consented ? 'ready' : 'welcome' }),
  setSource: (source) => set({ source }),
  setCamera: (cameraId) => { if (typeof localStorage !== 'undefined') { if (cameraId) localStorage.setItem('breathebreak.cameraId', cameraId); else localStorage.removeItem('breathebreak.cameraId') } set({ cameraId }) },
  begin: () => set((state) => state.consented ? { phase: 'starting', receiptPhase: advanceReceiptTimeline(state.receiptPhase, 'session-start'), baselineReady: false, baselineAcceptedCount: 0, baselineCompletionReason: undefined, pacerInterrupted:false, uniqueRateSampleCount: 0, acceptedRateSampleCount: 0, error: undefined, startedAt: Date.now(), gatedRates: [], sample: undefined, recap: undefined } : state),
  running: () => set({ phase: 'running' }),
  reconnecting: () => set({ phase: 'reconnecting' }),
  markBaselineReady: (reason) => set((state) => state.receiptPhase === 'baseline' && !state.baselineReady ? { baselineReady: true, baselineCompletionReason: reason } : state),
  startGuided: () => set((state) => state.baselineReady ? { receiptPhase: advanceReceiptTimeline(state.receiptPhase, 'pacer-start') } : state),
  endGuided: () => set((state) => ({ receiptPhase: advanceReceiptTimeline(state.receiptPhase, 'pacer-end') })),
  interruptGuided:()=>set({receiptPhase:'complete',pacerInterrupted:true}),
  receiveSample: (sample) => set({ sample }),
  observeRateSample: (accepted) => set((state) => ({ uniqueRateSampleCount: state.uniqueRateSampleCount + 1, acceptedRateSampleCount: state.acceptedRateSampleCount + (accepted ? 1 : 0) })),
  receiveRate: (rate) => set((state) => { const count = state.receiptPhase === 'baseline' ? state.baselineAcceptedCount + 1 : state.baselineAcceptedCount; return { gatedRates: [...state.gatedRates, rate], baselineAcceptedCount: count, ...(state.receiptPhase === 'baseline' && !state.baselineReady && count >= RECEIPT_BASELINE_TARGET_READINGS ? { baselineReady: true, baselineCompletionReason: 'count' as const } : {}) } }),
  clearMeasurements: () => set({ sample: undefined, gatedRates: [], recap: undefined }),
  stopping: () => set({ phase: 'stopping' }),
  finish: (options) => set((state) => {
    const receipt=state.pacerInterrupted?{...options.receipt,kind:'interrupted' as const,before:undefined,after:undefined,change:undefined,median:undefined,minimum:undefined,maximum:undefined}:options.receipt
    const recap = Object.freeze({ durationSeconds: Math.max(0, Math.round((Date.now() - (state.startedAt ?? Date.now())) / 1000)), sampleCount: receipt.count, uniqueRateSampleCount: state.uniqueRateSampleCount, acceptedRateSampleCount:state.acceptedRateSampleCount, baselineAcceptedCount: receipt.beforeCount, guidedAcceptedCount: receipt.afterCount, source: state.source, guidedPaceCompleted: options.guidedPaceCompleted === true, pacerInterrupted:state.pacerInterrupted, receiptSufficient:receipt.kind==='full', receiptKind:receipt.kind, ...(receipt.before===undefined?{}:{before:receipt.before}), ...(receipt.after===undefined?{}:{after:receipt.after}), ...(receipt.change===undefined?{}:{change:receipt.change}), ...(receipt.median===undefined?{}:{median:receipt.median}), ...(receipt.minimum===undefined?{}:{minimum:receipt.minimum}), ...(receipt.maximum===undefined?{}:{maximum:receipt.maximum}), ...(options.guidePace?{guideInhaleSeconds:options.guidePace.inhaleSeconds,guideExhaleSeconds:options.guidePace.exhaleSeconds}:{}), chestTrace:Object.freeze([...(options.chestTrace??[])]) })
    return { phase: 'recap', receiptPhase: advanceReceiptTimeline(state.receiptPhase, 'session-end'), baselineReady: false, recap, gatedRates: [], sample: undefined, startedAt: undefined }
  }),
  fail: (error) => set({ phase: 'error', receiptPhase: 'idle', baselineReady: false, baselineAcceptedCount: 0, baselineCompletionReason: undefined, pacerInterrupted:false, uniqueRateSampleCount: 0, acceptedRateSampleCount: 0, error, sample: undefined, recap: undefined, gatedRates: [], startedAt: undefined }),
  reset: () => set({ phase: 'ready', receiptPhase: 'idle', baselineReady: false, baselineAcceptedCount: 0, baselineCompletionReason: undefined, pacerInterrupted:false, uniqueRateSampleCount: 0, acceptedRateSampleCount: 0, sample: undefined, error: undefined, recap: undefined, gatedRates: [], startedAt: undefined })
}))
