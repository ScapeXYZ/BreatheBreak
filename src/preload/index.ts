import { contextBridge, ipcRenderer } from 'electron'
// Bundled by relative path so Electron's sandboxed preload needs no package require.
// @ts-expect-error The published preload is JavaScript-only.
import '../../node_modules/@smartspectra/node-sdk/js/preload/index.js'
import type { BeginLiveTestSessionRequest, EndLiveTestSessionRequest, LiveTestConfig, LiveTestCounters, LiveTestEventPayload, LiveTestSessionSummary } from '../shared/liveTest'

contextBridge.exposeInMainWorld('breathebreak', {
  getRuntimeInfo: (): Promise<{ platform: string; version: string }> => ipcRenderer.invoke('app:get-runtime-info'),
  getLiveTestConfig: (): Promise<LiveTestConfig> => ipcRenderer.invoke('app:get-live-test-config'),
  beginLiveTestSession: (request: BeginLiveTestSessionRequest): Promise<string | undefined> => ipcRenderer.invoke('app:begin-live-test-session', request),
  endLiveTestSession: (request: EndLiveTestSessionRequest): Promise<LiveTestSessionSummary | undefined> => ipcRenderer.invoke('app:end-live-test-session', request),
  copyLiveTestRunReport: (): Promise<boolean> => ipcRenderer.invoke('app:copy-live-test-run-report'),
  updateLiveTestCounters: (counters: LiveTestCounters): void => ipcRenderer.send('app:update-live-test-counters', counters),
  recordLiveTestEvent: (event: LiveTestEventPayload): void => ipcRenderer.send('app:record-live-test-event', event)
})
