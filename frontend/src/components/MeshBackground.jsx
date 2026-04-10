import { useEffect, useRef } from 'react'

// Each blob: hue, sat, light, initial position, radius, speed, alpha
const blobsDark = [
  { hue: 162, sat: 90, light: 55, x: 0.18, y: 0.18, r: 0.85, sx: 0.00018, sy: 0.00012, alpha: 0.85 },
  { hue: 188, sat: 95, light: 55, x: 0.82, y: 0.28, r: 0.80, sx: 0.00022, sy: 0.00014, alpha: 0.75 },
  { hue: 268, sat: 80, light: 45, x: 0.50, y: 0.85, r: 0.95, sx: 0.00015, sy: 0.00020, alpha: 0.70 },
  { hue: 145, sat: 90, light: 50, x: 0.08, y: 0.78, r: 0.70, sx: 0.00025, sy: 0.00010, alpha: 0.70 },
  { hue: 200, sat: 85, light: 50, x: 0.92, y: 0.82, r: 0.75, sx: 0.00012, sy: 0.00018, alpha: 0.70 },
  { hue: 320, sat: 80, light: 50, x: 0.50, y: 0.45, r: 0.55, sx: 0.00020, sy: 0.00016, alpha: 0.45 },
]

const blobsLight = [
  { hue: 162, sat: 80, light: 70, x: 0.20, y: 0.20, r: 0.80, sx: 0.00018, sy: 0.00012, alpha: 0.75 },
  { hue: 188, sat: 80, light: 72, x: 0.80, y: 0.30, r: 0.75, sx: 0.00022, sy: 0.00014, alpha: 0.70 },
  { hue: 268, sat: 70, light: 78, x: 0.50, y: 0.85, r: 0.90, sx: 0.00015, sy: 0.00020, alpha: 0.65 },
  { hue: 145, sat: 80, light: 73, x: 0.10, y: 0.80, r: 0.65, sx: 0.00025, sy: 0.00010, alpha: 0.65 },
  { hue: 200, sat: 75, light: 75, x: 0.90, y: 0.85, r: 0.70, sx: 0.00012, sy: 0.00018, alpha: 0.65 },
  { hue: 320, sat: 70, light: 78, x: 0.50, y: 0.45, r: 0.55, sx: 0.00020, sy: 0.00016, alpha: 0.45 },
]

/* ------------------------------------------------------------------ */
// Full-screen canvas mesh gradient.  Six animated blobs drift around
// with sine motion; composite mode is 'lighter' in dark mode and
// 'multiply' in light mode so the colours feel natural either way.
/* ------------------------------------------------------------------ */
export default function MeshBackground({ theme }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2)
    let rafId = 0

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2)
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = W * DPR
      canvas.height = H * DPR
      canvas.style.width = W + 'px'
      canvas.style.height = H + 'px'
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    function frame(t) {
      const isLight = theme === 'light'
      const blobs = isLight ? blobsLight : blobsDark
      const baseBg = isLight ? '#eef5f1' : '#04100c'

      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = baseBg
      ctx.fillRect(0, 0, W, H)

      ctx.globalCompositeOperation = isLight ? 'multiply' : 'lighter'

      for (let i = 0; i < blobs.length; i++) {
        const b = blobs[i]
        const cx = (b.x + Math.sin(t * b.sx * 3 + i * 1.7) * 0.22) * W
        const cy = (b.y + Math.cos(t * b.sy * 3 + i * 2.3) * 0.25) * H
        const radius = Math.max(W, H) * b.r

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
        const color = `hsla(${b.hue}, ${b.sat}%, ${b.light}%, ${b.alpha})`
        const colorEnd = `hsla(${b.hue}, ${b.sat}%, ${b.light}%, 0)`
        grad.addColorStop(0, color)
        grad.addColorStop(1, colorEnd)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalCompositeOperation = 'source-over'
    }

    function loop(now) {
      frame(now)
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
  }, [theme])

  return <canvas ref={canvasRef} id="mesh-bg" aria-hidden="true" />
}
