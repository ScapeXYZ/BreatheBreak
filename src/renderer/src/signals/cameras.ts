import type { CameraDevice } from './types'

export function videoCameras(devices: MediaDeviceInfo[]): CameraDevice[] {
  let unnamed = 0
  return devices.filter((device) => device.kind === 'videoinput').map((device) => ({ id: device.deviceId, label: device.label || `Camera ${++unnamed}` }))
}

export function resolveSelectedCamera(cameras: CameraDevice[], rememberedId?: string): string | undefined {
  if (rememberedId) return cameras.some((camera) => camera.id === rememberedId) ? rememberedId : undefined
  return cameras[0]?.id
}

export function stopMediaStream(stream?: MediaStream): number { const tracks=stream?.getTracks()??[];tracks.forEach((track)=>track.stop());return tracks.length }

export function realCameraStreamConstraints(cameraId: string): MediaStreamConstraints {
  return { audio: false, video: { deviceId: { exact: cameraId }, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } } }
}

export type NegotiatedCameraSettings = Readonly<{ width: number | null; height: number | null; frameRate: number | null }>

export function negotiatedCameraSettings(stream: MediaStream): NegotiatedCameraSettings {
  const settings = stream.getVideoTracks()[0]?.getSettings()
  const value = (candidate: unknown): number | null => typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0 ? candidate : null
  return Object.freeze({ width: value(settings?.width), height: value(settings?.height), frameRate: value(settings?.frameRate) })
}
