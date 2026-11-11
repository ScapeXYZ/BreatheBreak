import { describe, expect, it, vi } from 'vitest'
import { resolveSelectedCamera, stopMediaStream, videoCameras } from './cameras'

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
    stopMediaStream({ getTracks: () => tracks } as unknown as MediaStream)
    expect(tracks.every((track) => track.stop.mock.calls.length === 1)).toBe(true)
  })
})
