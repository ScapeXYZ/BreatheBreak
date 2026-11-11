import { contextBridge, ipcRenderer } from 'electron'
import '@smartspectra/node-sdk/preload'

contextBridge.exposeInMainWorld('breathebreak', {
  getRuntimeInfo: (): Promise<{ platform: string; version: string }> => ipcRenderer.invoke('app:get-runtime-info')
})
