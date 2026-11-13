import { useEffect, useRef } from 'react'

const FRAME_INTERVAL_MS = 34

export function GardenCanvas({ chest = 0, rate = 10, active }: { chest?: number; rate?: number; active: boolean }): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const valuesRef = useRef({ chest, rate, active })
  useEffect(() => { valuesRef.current = { chest, rate, active } }, [chest, rate, active])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    let timer = 0
    let windowFocused = true
    let size = { width: 0, height: 0, ratio: 0 }
    const styles = getComputedStyle(document.documentElement)
    const colors = {
      ground: styles.getPropertyValue('--garden-ground').trim(),
      depth: styles.getPropertyValue('--garden-depth').trim(),
      petal: styles.getPropertyValue('--garden-petal').trim()
    }
    const resize = (): void => {
      const ratio = window.devicePixelRatio || 1
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (width === size.width && height === size.height && ratio === size.ratio) return
      size = { width, height, ratio }
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
    }
    const paint = (timestamp: number): void => {
      resize()
      const started = performance.now()
      const { width, height, ratio } = size
      const { chest: currentChest, rate: currentRate } = valuesRef.current
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.clearRect(0, 0, width, height)
      const gradient = context.createRadialGradient(width / 2, height * 0.66, 8, width / 2, height * 0.62, Math.max(width, height) * 0.72)
      gradient.addColorStop(0, colors.depth)
      gradient.addColorStop(1, colors.ground)
      context.fillStyle = gradient
      context.fillRect(0, 0, width, height)
      const petals = 10
      const base = 54 + currentChest * 10
      context.save()
      context.translate(width / 2, height * 0.5)
      context.globalCompositeOperation = 'screen'
      for (let index = 0; index < petals; index += 1) {
        context.rotate((Math.PI * 2) / petals)
        context.beginPath()
        context.ellipse(0, -base * 0.7, base * 0.32, base * 0.76, 0, 0, Math.PI * 2)
        context.globalAlpha = 0.22 + Math.min(0.14, currentRate / 100)
        context.fillStyle = colors.petal
        context.fill()
      }
      context.restore()
      if (document.documentElement.dataset.screenshotHarness) {
        window.dispatchEvent(new CustomEvent('breathebreak:garden-frame', { detail: { durationMs: performance.now() - started, timestamp } }))
      }
    }
    const tick = (): void => {
      timer = 0
      if (document.hidden || !windowFocused || !valuesRef.current.active) return
      paint(performance.now())
      timer = window.setTimeout(tick, FRAME_INTERVAL_MS)
    }
    const sync = (): void => {
      window.clearTimeout(timer)
      timer = 0
      if (!document.hidden && windowFocused && valuesRef.current.active) timer = window.setTimeout(tick, FRAME_INTERVAL_MS)
    }
    const onFocus = (): void => { windowFocused = true; sync() }
    const onBlur = (): void => { windowFocused = false; sync() }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    document.addEventListener('visibilitychange', sync)
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
    window.addEventListener('breathebreak:garden-state', sync)
    resize()
    paint(performance.now())
    sync()
    return () => {
      window.clearTimeout(timer)
      observer.disconnect()
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('breathebreak:garden-state', sync)
    }
  }, [])

  useEffect(() => { window.dispatchEvent(new Event('breathebreak:garden-state')) }, [active])
  return <canvas ref={canvasRef} className="garden-canvas" aria-label="Animated night garden breathing bloom" />
}
