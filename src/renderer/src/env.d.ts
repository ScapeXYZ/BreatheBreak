import type { BeginLiveTestSessionRequest, EndLiveTestSessionRequest, LiveTestConfig, LiveTestCounters, LiveTestEventPayload, LiveTestSessionSummary } from '../../shared/liveTest'

interface Window {
  breathebreak: {
    getRuntimeInfo(): Promise<{ platform: string; version: string }>
    getLiveTestConfig(): Promise<LiveTestConfig>
    beginLiveTestSession(request: BeginLiveTestSessionRequest): Promise<string | undefined>
    endLiveTestSession(request: EndLiveTestSessionRequest): Promise<LiveTestSessionSummary | undefined>
    copyLiveTestRunReport(): Promise<boolean>
    updateLiveTestCounters(counters: LiveTestCounters): void
    recordLiveTestEvent(event: LiveTestEventPayload): void
  }
}
