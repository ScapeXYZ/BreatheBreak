export type CameraPermissionContext = {
  permission: string
  mediaTypes: readonly string[]
  requestingUrl: string
  applicationUrl: string
  sameWebContents: boolean
}

function sameApplicationOrigin(requestingUrl: string, applicationUrl: string): boolean {
  try {
    const requesting = new URL(requestingUrl)
    const application = new URL(applicationUrl)
    return application.protocol === 'file:' ? requesting.protocol === 'file:' : requesting.origin === application.origin
  } catch {
    return false
  }
}

export function cameraPermissionAllowed(context: CameraPermissionContext): boolean {
  return context.sameWebContents
    && context.permission === 'media'
    && context.mediaTypes.length === 1
    && context.mediaTypes[0] === 'video'
    && sameApplicationOrigin(context.requestingUrl, context.applicationUrl)
}
