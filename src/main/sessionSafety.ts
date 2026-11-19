export const SESSION_MAX_DURATION_MS = 180_000
export type ForcedSessionStopReason = 'suspend-or-lock' | 'maximum-duration'

export class SessionSafetyController {
  private timer?: unknown
  private active = false
  constructor(private readonly schedule: (callback: () => void, milliseconds: number) => unknown, private readonly cancel: (timer: unknown) => void, private readonly notify: (reason: ForcedSessionStopReason) => void) {}
  begin(): void { this.end(); this.active = true; this.timer = this.schedule(() => this.request('maximum-duration'), SESSION_MAX_DURATION_MS) }
  end(): void { if (this.timer !== undefined) this.cancel(this.timer); this.timer = undefined; this.active = false }
  suspend(): void { this.request('suspend-or-lock') }
  lockScreen(): void { this.request('suspend-or-lock') }
  private request(reason: ForcedSessionStopReason): void { if (!this.active) return; if (this.timer !== undefined) this.cancel(this.timer); this.timer = undefined; this.active = false; this.notify(reason) }
}
