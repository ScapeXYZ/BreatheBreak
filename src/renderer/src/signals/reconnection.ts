export class ReconnectionPolicy {
  private attempts = 0
  constructor(readonly maximumAttempts = 3, readonly baseDelayMs = 500) {}
  nextDelay(): number | undefined {
    if (this.attempts >= this.maximumAttempts) return undefined
    return this.baseDelayMs * 2 ** this.attempts++
  }
  reset(): void { this.attempts = 0 }
  get attemptCount(): number { return this.attempts }
}

export const wait = (delayMs: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, delayMs))
