interface Window {
  breathebreak: {
    getRuntimeInfo(): Promise<{ platform: string; version: string }>
    getLiveTestConfig(): Promise<{ enabled: boolean }>
    updateLiveTestCounters(counters: { deliveredFrames: number; sentFrames: number }): void
    recordLiveTestEvent(event: 'media-tracks-stopped'): void
  }
}
