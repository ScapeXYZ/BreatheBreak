import { contextBridge, ipcRenderer } from 'electron'
import type { BeginLiveTestSessionRequest, EndLiveTestSessionRequest, LiveTestConfig, LiveTestCounters, LiveTestEventPayload, LiveTestSessionSummary } from '../shared/liveTest'
import type { ForcedSessionStopReason } from '../main/sessionSafety'

contextBridge.exposeInMainWorld('breathebreak', {
  simulationOnly:true,
  getRuntimeInfo: (): Promise<{ platform: string; version: string }> => ipcRenderer.invoke('app:get-runtime-info'),
  getLiveTestConfig: (): Promise<LiveTestConfig> => ipcRenderer.invoke('app:get-live-test-config'),
  beginLiveTestSession: (request: BeginLiveTestSessionRequest): Promise<string | undefined> => ipcRenderer.invoke('app:begin-live-test-session', request),
  endLiveTestSession: (request: EndLiveTestSessionRequest): Promise<LiveTestSessionSummary | undefined> => ipcRenderer.invoke('app:end-live-test-session', request),
  copyLiveTestRunReport: (): Promise<boolean> => ipcRenderer.invoke('app:copy-live-test-run-report'),
  updateLiveTestCounters: (counters: LiveTestCounters): void => ipcRenderer.send('app:update-live-test-counters', counters),
  recordLiveTestEvent: (event: LiveTestEventPayload): void => ipcRenderer.send('app:record-live-test-event', event),
  setSessionActive: (active: boolean): void => ipcRenderer.send('app:set-session-active', active),
  onForcedSessionStop: (listener: (reason: ForcedSessionStopReason) => void): (() => void) => {const handler=(_event:Electron.IpcRendererEvent,reason:ForcedSessionStopReason):void=>listener(reason);ipcRenderer.on('app:forced-session-stop',handler);return()=>ipcRenderer.removeListener('app:forced-session-stop',handler)}
})
