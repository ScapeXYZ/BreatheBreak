import { describe, expect, it, vi } from 'vitest'
import { negotiatedCameraSettings, resolveSelectedCamera, stopMediaStream, videoCameras } from './cameras'

const device = (kind: MediaDeviceKind, deviceId: string, label = '') => ({ kind, deviceId, label }) as MediaDeviceInfo

describe('camera selection and cleanup', () => {
  const cameras = [{ id: 'a', label: 'Front' }, { id: 'b', label: 'Desk' }]
  it('lists video inputs only and supplies non-sensitive fallback labels', () => {
    expect(videoCameras([device('audioinput', 'mic'), device('videoinput', 'a'), device('videoinput', 'b', 'Desk')])).toEqual([{ id: 'a', label: 'Camera 1' }, { id: 'b', label: 'Desk' }])
  })
  it('restores a remembered camera when it is present', () => { expect(resolveSelectedCamera(cameras, 'b')).toBe('b') })
  it('fails closed instead of falling back when a remembered camera is missing', () => { expect(resolveSelectedCamera(cameras, 'missing')).toBeUndefined() })
  it('stops every track during cleanup', () => {
    const tracks = [{ stop: vi.fn() }, { stop: vi.fn() }]
    expect(stopMediaStream({ getTracks: () => tracks } as unknown as MediaStream)).toBe(2)
    expect(tracks.every((track) => track.stop.mock.calls.length === 1)).toBe(true)
  })
  it('returns only negotiated dimensions and frame rate', () => {
    const stream = { getVideoTracks: () => [{ getSettings: () => ({ width: 1280, height: 720, frameRate: 29.97, deviceId: 'not-exported' }) }] } as unknown as MediaStream
    expect(negotiatedCameraSettings(stream)).toEqual({ width: 1280, height: 720, frameRate: 29.97 })
  })
  it('uses nulls when negotiated settings are missing', () => {
    const stream = { getVideoTracks: () => [] } as unknown as MediaStream
    expect(negotiatedCameraSettings(stream)).toEqual({ width: null, height: null, frameRate: null })
  })
})
