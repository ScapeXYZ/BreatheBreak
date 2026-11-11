import { useEffect, useRef } from 'react'

export function GardenCanvas({ chest = 0, rate = 10, active }: { chest?: number; rate?: number; active: boolean }): JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    let frame = 0
    const draw = (): void => {
      const ratio = window.devicePixelRatio || 1
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (canvas.width !== width * ratio || canvas.height !== height * ratio) { canvas.width = width * ratio; canvas.height = height * ratio }
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.clearRect(0, 0, width, height)
      const gradient = context.createRadialGradient(width / 2, height * 0.72, 5, width / 2, height * 0.65, Math.max(width, height) * 0.6)
      gradient.addColorStop(0, '#183b34'); gradient.addColorStop(1, '#08111d')
      context.fillStyle = gradient; context.fillRect(0, 0, width, height)
      const petals = 10; const base = 48 + (active ? chest * 9 : 0); const hue = 295 - Math.min(40, rate)
      context.save(); context.translate(width / 2, height * 0.53); context.globalCompositeOperation = 'screen'
      for (let i = 0; i < petals; i++) { context.rotate((Math.PI * 2) / petals); context.beginPath(); context.ellipse(0, -base * 0.68, base * 0.33, base * 0.72, 0, 0, Math.PI * 2); context.fillStyle = `hsla(${hue + i * 2},45%,68%,.38)`; context.fill() }
      context.restore()
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [chest, rate, active])
  return <canvas ref={ref} className="h-full w-full" aria-label="Animated night garden breathing bloom" />
}
