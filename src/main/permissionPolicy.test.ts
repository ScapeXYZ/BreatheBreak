import { describe, expect, it } from 'vitest'
import { cameraPermissionAllowed, type CameraPermissionContext } from './permissionPolicy'

const allowed: CameraPermissionContext = {
  permission: 'media',
  mediaTypes: ['video'],
  requestingUrl: 'http://localhost:5173/session',
  applicationUrl: 'http://localhost:5173/',
  sameWebContents: true
}

describe('camera permission policy', () => {
  it('allows only video camera access from the application origin and contents', () => {
    expect(cameraPermissionAllowed(allowed)).toBe(true)
    expect(cameraPermissionAllowed({ ...allowed, applicationUrl: 'file:///C:/app/index.html', requestingUrl: 'file:///C:/app/index.html' })).toBe(true)
  })

  it.each([
    ['notifications', { permission: 'notifications' }],
    ['microphone', { mediaTypes: ['audio'] }],
    ['camera plus microphone', { mediaTypes: ['video', 'audio'] }],
    ['another origin', { requestingUrl: 'https://example.com/' }],
    ['another webContents', { sameWebContents: false }],
    ['missing media type', { mediaTypes: [] }]
  ])('denies %s', (_label, change) => {
    expect(cameraPermissionAllowed({ ...allowed, ...change })).toBe(false)
  })
})
