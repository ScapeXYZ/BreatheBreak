import { contextBridge, ipcRenderer } from 'electron'
// Bundled by relative path so Electron's sandboxed preload needs no package require.
// @ts-expect-error The published preload is JavaScript-only.
import '../../node_modules/@smartspectra/node-sdk/js/preload/index.js'
import type { LiveTestCounters, LiveTestEventPayload } from '../shared/liveTest'

contextBridge.exposeInMainWorld('breathebreak', {
  getRuntimeInfo: (): Promise<{ platform: string; version: string }> => ipcRenderer.invoke('app:get-runtime-info'),
  getLiveTestConfig: (): Promise<{ enabled: boolean }> => ipcRenderer.invoke('app:get-live-test-config'),
  updateLiveTestCounters: (counters: LiveTestCounters): void => ipcRenderer.send('app:update-live-test-counters', counters),
  recordLiveTestEvent: (event: LiveTestEventPayload): void => ipcRenderer.send('app:record-live-test-event', event)
})
