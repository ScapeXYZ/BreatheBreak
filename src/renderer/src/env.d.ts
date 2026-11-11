interface Window {
  breathebreak: { getRuntimeInfo(): Promise<{ platform: string; version: string }> }
}
