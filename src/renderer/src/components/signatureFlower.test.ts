import { describe, expect, it } from 'vitest'
import { AutoQualityController, FLOWER_FRAME_INTERVAL_MS, FLOWER_PARTICLES, createFlowerParticles, particleLimit, resolveBreathScale, shouldRenderFrame } from './signatureFlower'

describe('signature flower', () => {
  it('reacts to gated chest changes and invents no motion without input', () => { expect(resolveBreathScale(.8, 1, false)).toBeGreaterThan(1); expect(resolveBreathScale(undefined, 1.08, false)).toBe(1); expect(resolveBreathScale(Number.NaN, 1.08, false)).toBe(1) })
  it('keeps quality tiers inside the approved particle limits', () => { expect(createFlowerParticles(FLOWER_PARTICLES.high)).toHaveLength(620); expect(particleLimit('high')).toBe(620); expect(particleLimit('low')).toBe(240); expect(particleLimit('auto', 900)).toBe(620); expect(particleLimit('auto', 20)).toBe(240) })
  it('adapts Auto density after sustained measured draw cost', () => { const auto = new AutoQualityController(); for (let i = 0; i < 30; i += 1) auto.observe(9); expect(auto.count).toBe(440); for (let i = 0; i < 30; i += 1) auto.observe(9); expect(auto.count).toBe(240) })
  it('caps at 30 FPS and suspends while hidden, inactive, or on Recap', () => { expect(shouldRenderFrame(0, FLOWER_FRAME_INTERVAL_MS - .1, true, false, false)).toBe(false); expect(shouldRenderFrame(0, 34, true, false, false)).toBe(true); expect(shouldRenderFrame(0, 34, true, true, false)).toBe(false); expect(shouldRenderFrame(0, 34, true, false, true)).toBe(false); expect(shouldRenderFrame(0, 34, false, false, false)).toBe(false) })
  it('reduces measured deformation under reduced motion', () => { expect(resolveBreathScale(1, 1, true)).toBe(1.025); expect(resolveBreathScale(1, 1, false)).toBeGreaterThan(1.025) })
  it('has no guided-pacer state or timing dependency', () => { expect(createFlowerParticles(10).every(point => !('breathPhase' in point))).toBe(true) })
})
