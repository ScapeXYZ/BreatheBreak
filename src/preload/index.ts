import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('breathebreak', {
  getRuntimeInfo: (): Promise<{ platform: string; version: string }> => ipcRenderer.invoke('app:get-runtime-info')
})
