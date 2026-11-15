import { describe, expect, it, vi } from 'vitest'
import { SESSION_MAX_DURATION_MS, SessionSafetyController } from './sessionSafety'

describe('session safety controller', () => {
  it.each(['suspend','lockScreen'] as const)('%s requests an immediate camera-releasing stop only while active', (event) => {
    const notify = vi.fn(); const cancel = vi.fn(); let scheduled: (() => void) | undefined
    const safety = new SessionSafetyController((callback) => { scheduled = callback; return 7 }, cancel, notify)
    safety[event](); expect(notify).not.toHaveBeenCalled()
    safety.begin(); safety[event](); expect(notify).toHaveBeenCalledWith('suspend-or-lock'); expect(cancel).toHaveBeenCalledWith(7)
    scheduled?.(); expect(notify).toHaveBeenCalledTimes(1)
  })

  it('enforces the three-minute maximum', () => {
    const notify = vi.fn(); let scheduled: (() => void) | undefined; let delay = 0
    const safety = new SessionSafetyController((callback, milliseconds) => { scheduled = callback; delay = milliseconds; return 9 }, () => {}, notify)
    safety.begin(); expect(delay).toBe(SESSION_MAX_DURATION_MS); scheduled?.(); expect(notify).toHaveBeenCalledWith('maximum-duration')
  })
})
