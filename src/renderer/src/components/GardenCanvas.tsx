import { useEffect, useRef } from 'react'
import { AutoQualityController, createFlowerParticles, FLOWER_PARTICLES, particleLimit, resolveBreathScale, shouldRenderFrame, type FlowerQuality } from './signatureFlower'

type Props = { readChest: () => number | undefined; active: boolean; quality?: FlowerQuality; preview?: boolean }
const particles = createFlowerParticles(FLOWER_PARTICLES.high)
const coreRings = [[.072,.07],[.05,.14],[.03,.3],[.014,.82]] as const

export function GardenCanvas({ readChest, active, quality = 'auto', preview = false }: Props): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const valuesRef = useRef({ readChest, active, quality, preview })
  useEffect(() => { valuesRef.current = { readChest, active, quality, preview } }, [readChest, active, quality, preview])
  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d', { alpha: false })
    if (!canvas || !context) return
    let frame = 0, lastFrameAt = -Infinity, breathScale = 1, lastChest: number | undefined, windowFocused = true
    let size = { width: 0, height: 0, ratio: 0 }
    const auto = new AutoQualityController(), motion = matchMedia('(prefers-reduced-motion: reduce)')
    const styles = getComputedStyle(document.documentElement)
    const colors = { ground: styles.getPropertyValue('--garden-ground').trim(), petal: styles.getPropertyValue('--garden-petal').trim(), center: styles.getPropertyValue('--garden-center').trim(), mesh: styles.getPropertyValue('--garden-mesh').trim() }
    const resize = (): void => { const ratio = Math.min(window.devicePixelRatio || 1, 2), width = canvas.clientWidth, height = canvas.clientHeight; if (width === size.width && height === size.height && ratio === size.ratio) return; size = { width, height, ratio }; canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio) }
    const paint = (now: number): void => {
      resize(); const started = performance.now(), { width, height, ratio } = size, options = valuesRef.current
      const chest = options.preview ? undefined : options.readChest(), changed = chest !== lastChest
      if (motion.matches && !options.preview && !changed && lastFrameAt > -Infinity) return
      lastChest = chest; breathScale = options.preview ? 1.035 : resolveBreathScale(chest, breathScale, motion.matches)
      context.setTransform(ratio, 0, 0, ratio, 0, 0); context.fillStyle = colors.ground; context.fillRect(0, 0, width, height)
      const cx = width * .5, cy = height * .49, radius = Math.min(width, height) * .29 * breathScale, count = particleLimit(options.quality, auto.count), low = options.quality === 'low'
      context.save(); context.translate(cx, cy); context.globalCompositeOperation = 'screen'; context.strokeStyle = colors.mesh; context.lineWidth = .45
      for (let index = 0; index < count; index += 1) {
        const point = particles[index], length = radius * (.22 + point.along * .86), widthCurve = radius * .28 * point.across, bend = Math.sin(point.along * Math.PI) * radius * .08
        const x = Math.cos(point.angle) * length - Math.sin(point.angle) * (widthCurve + bend), y = Math.sin(point.angle) * length + Math.cos(point.angle) * (widthCurve + bend)
        if (index % (low?3:10) === 0 && index + 9 < count) { const peer = particles[index + 9], peerLength = radius * (.22 + peer.along * .86), peerWidth = radius * .28 * peer.across, peerBend = Math.sin(peer.along * Math.PI) * radius * .08; context.globalAlpha = low?.15:.08; context.beginPath(); context.moveTo(x, y); context.lineTo(Math.cos(peer.angle) * peerLength - Math.sin(peer.angle) * (peerWidth + peerBend), Math.sin(peer.angle) * peerLength + Math.cos(peer.angle) * (peerWidth + peerBend)); context.stroke() }
        context.globalAlpha = low?Math.min(.9,point.alpha*1.25):point.alpha; context.fillStyle = colors.petal; context.beginPath(); context.arc(x, y, low?point.size*1.12:point.size, 0, Math.PI * 2); context.fill()
      }
      context.fillStyle = colors.center;for(const [coreRadius,alpha] of coreRings){context.globalAlpha=alpha;context.beginPath();context.arc(0,0,radius*coreRadius,0,Math.PI*2);context.fill()}context.restore()
      const durationMs = performance.now() - started; if (options.quality === 'auto') auto.observe(durationMs); lastFrameAt = now
      if (document.documentElement.dataset.screenshotHarness) window.dispatchEvent(new CustomEvent('breathebreak:garden-frame', { detail: { durationMs, timestamp: now, quality: options.quality, particles: count, chest, reducedMotion: motion.matches } }))
    }
    const tick = (now: number): void => { const options = valuesRef.current; if (!options.preview && shouldRenderFrame(lastFrameAt, now, options.active, document.hidden || !windowFocused, false)) paint(now); frame = requestAnimationFrame(tick) }
    const onFocus = (): void => { windowFocused = true }
    const onBlur = (): void => { windowFocused = false }
    const observer = new ResizeObserver(() => { resize(); paint(performance.now()) }); observer.observe(canvas); window.addEventListener('focus', onFocus); window.addEventListener('blur', onBlur); resize(); paint(performance.now()); frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('focus', onFocus); window.removeEventListener('blur', onBlur) }
  }, [])
  return <canvas ref={canvasRef} className="garden-canvas" aria-label={preview ? 'Preview of the breathing flower' : 'Live measured breathing flower'} data-quality={quality} />
}
