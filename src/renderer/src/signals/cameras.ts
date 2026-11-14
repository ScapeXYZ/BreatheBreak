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
