import type { LiveTestCounters, LiveTestEventPayload } from '../../shared/liveTest'

interface Window {
  breathebreak: {
    getRuntimeInfo(): Promise<{ platform: string; version: string }>
    getLiveTestConfig(): Promise<{ enabled: boolean }>
    updateLiveTestCounters(counters: LiveTestCounters): void
    recordLiveTestEvent(event: LiveTestEventPayload): void
  }
}
