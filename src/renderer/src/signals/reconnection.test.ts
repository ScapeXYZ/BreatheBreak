import { describe, expect, it } from 'vitest'
import { ReconnectionPolicy } from './reconnection'
import { retryAttemptsForLiveTest } from '../../../shared/liveTest'

describe('ReconnectionPolicy', () => {
  it('provides bounded exponential delays for three attempts', () => {
    const policy = new ReconnectionPolicy()
    expect([policy.nextDelay(), policy.nextDelay(), policy.nextDelay(), policy.nextDelay()]).toEqual([500, 1000, 2000, undefined])
    expect(policy.attemptCount).toBe(3)
  })
  it('resets after a successful connection', () => {
    const policy = new ReconnectionPolicy(3, 10)
    policy.nextDelay(); policy.nextDelay(); policy.reset()
    expect(policy.nextDelay()).toBe(10)
  })
  it('disables auto-retry in explicit live-test mode', () => {
    const policy = new ReconnectionPolicy(retryAttemptsForLiveTest(true))
    expect(policy.nextDelay()).toBeUndefined()
    expect(policy.attemptCount).toBe(0)
  })
})
