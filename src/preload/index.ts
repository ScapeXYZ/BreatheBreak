import { contextBridge, ipcRenderer } from 'electron'
// Bundled by relative path so Electron's sandboxed preload needs no package require.
// @ts-expect-error The published preload is JavaScript-only.
import '../../node_modules/@smartspectra/node-sdk/js/preload/index.js'

contextBridge.exposeInMainWorld('breathebreak', {
  getRuntimeInfo: (): Promise<{ platform: string; version: string }> => ipcRenderer.invoke('app:get-runtime-info'),
  getLiveTestConfig: (): Promise<{ enabled: boolean }> => ipcRenderer.invoke('app:get-live-test-config'),
  updateLiveTestCounters: (counters: { deliveredFrames: number; sentFrames: number }): void => ipcRenderer.send('app:update-live-test-counters', counters)
})
