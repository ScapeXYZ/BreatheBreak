import { contextBridge, ipcRenderer } from 'electron'
import '@smartspectra/node-sdk/preload'

contextBridge.exposeInMainWorld('breathebreak', {
  getRuntimeInfo: (): Promise<{ platform: string; version: string }> => ipcRenderer.invoke('app:get-runtime-info'),
  getLiveTestConfig: (): Promise<{ enabled: boolean }> => ipcRenderer.invoke('app:get-live-test-config'),
  updateLiveTestCounters: (counters: { deliveredFrames: number; sentFrames: number }): void => ipcRenderer.send('app:update-live-test-counters', counters)
})
