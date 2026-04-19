import { useState, useEffect, useRef } from 'react'
import { format, parseISO } from 'date-fns'

// Build a series of [x, y] points from raw counts, scaled to the
// container width and a fixed 240px height with a little padding.
function buildPath(values, w, h, pad = 16) {
  const min = Math.min(...values) * 0.9
  const max = Math.max(...values) * 1.05
  const sx = (w - pad * 2) / (values.length - 1)
  const sy = (h - pad * 2) / (max - min)
  return values.map((v, i) => {
    const x = pad + i * sx
    const y = h - pad - (v - min) * sy
    return [x, y]
  })
}

// Convert points to a smooth SVG path using cubic beziers.
function smoothPath(pts) {
  if (!pts.length) return ''
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]
    const cx = (x1 + x2) / 2
    d += ` C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`
  }
  return d
}

/* ------------------------------------------------------------------ */
// Daily visits line chart with 7-day rolling average + hover tooltip
/* ------------------------------------------------------------------ */
export default function DailyTrend({ dailyTrend }) {
  const wrapRef = useRef(null)
  const pathRef = useRef(null)
  const avgRef = useRef(null)
  const [w, setW] = useState(700)
  const h = 240

  const data = dailyTrend?.daily?.map((d) => d.count) ?? []
  const avg = dailyTrend?.rolling_7d?.map((d) => d.avg) ?? []
  const labels = dailyTrend?.daily?.map((d) => format(parseISO(d.date), 'MMM d')) ?? []

  const [hover, setHover] = useState(null)

  // ResizeObserver so the SVG stays crisp when the grid changes
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const pad = 28
  const pts = buildPath(data, w, h, pad)
  const ptsAvg = buildPath(avg, w, h, pad)
  const dPath = smoothPath(pts)
  const dAvg = smoothPath(ptsAvg)

  // Animate the main line drawing itself on mount or data change
  useEffect(() => {
    const p = pathRef.current
    if (!p || !dPath) return
    const len = p.getTotalLength()
    p.style.strokeDasharray = String(len)
    p.style.strokeDashoffset = String(len)
    p.getBoundingClientRect()
    p.style.transition = 'stroke-dashoffset 1.6s cubic-bezier(.2,.8,.2,1)'
    p.style.strokeDashoffset = '0'

    const safety = setTimeout(() => {
      p.style.strokeDashoffset = '0'
      p.style.transition = 'none'
    }, 2000)

    if (avgRef.current) {
      avgRef.current.style.strokeDasharray = `4 6`
      avgRef.current.style.opacity = '0'
      avgRef.current.style.transition = 'opacity 1s ease 1s'
      requestAnimationFrame(() => {
        if (avgRef.current) avgRef.current.style.opacity = '0.7'
      })
      setTimeout(() => {
        if (avgRef.current) avgRef.current.style.opacity = '0.7'
      }, 2200)
    }

    return () => clearTimeout(safety)
  }, [dPath])

  if (!data.length) return null

  const min = Math.min(...data) * 0.9
  const max = Math.max(...data) * 1.05
  const yTicks = [min, (min + max) / 2, max]

  function onMove(e) {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const sx = (w - pad * 2) / (data.length - 1)
    const i = Math.max(0, Math.min(data.length - 1, Math.round((x - pad) / sx)))
    setHover({
      i,
      x: pts[i]?.[0] ?? 0,
      y: pts[i]?.[1] ?? 0,
      val: data[i],
      avg: avg[i],
      label: labels[i],
    })
  }

  return (
    <div className="glass card lift reveal" style={{ '--rd': '380ms' }}>
      <div className="card-head">
        <div>
          <h3 className="card-title">Daily trend</h3>
          <p className="card-sub">Visits per day · 7-day rolling average</p>
        </div>
        <div className="chart-legend">
          <span><span className="swatch" style={{ background: 'var(--accent)' }} />Visits</span>
          <span><span className="swatch" style={{ background: 'var(--accent-2)' }} />7d avg</span>
        </div>
      </div>

      <div ref={wrapRef} className="chart-wrap" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="oklch(82% 0.16 170)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="oklch(82% 0.16 170)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="lineStroke" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="oklch(82% 0.16 170)" />
              <stop offset="100%" stopColor="oklch(82% 0.13 200)" />
            </linearGradient>
          </defs>
          {yTicks.map((t, i) => {
            const y = h - pad - (t - min) * (h - pad * 2) / (max - min)
            return (
              <g key={i}>
                <line x1={pad} x2={w - pad} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="2 4" />
                <text x={6} y={y + 4} fill="var(--fg-3)" fontFamily="Geist Mono, monospace" fontSize="10">{Math.round(t)}</text>
              </g>
            )
          })}
          <path
            d={`${dPath} L ${pts[pts.length - 1]?.[0] ?? 0} ${h - pad} L ${pts[0]?.[0] ?? 0} ${h - pad} Z`}
            fill="url(#lineFill)"
            opacity="0.6"
          />
          <path ref={avgRef} d={dAvg} fill="none" stroke="oklch(82% 0.13 200)" strokeWidth="1.5" />
          <path ref={pathRef} d={dPath} fill="none" stroke="url(#lineStroke)" strokeWidth="2.4" strokeLinecap="round" />

          {hover && (
            <>
              <line x1={hover.x} x2={hover.x} y1={pad} y2={h - pad} stroke="rgba(255,255,255,0.18)" strokeDasharray="3 4" />
              <circle cx={hover.x} cy={hover.y} r="6" fill="oklch(82% 0.16 170)" opacity="0.25" />
              <circle cx={hover.x} cy={hover.y} r="3.4" fill="#fff" />
            </>
          )}
        </svg>

        {hover && (
          <div className="tooltip on" style={{ left: hover.x, top: hover.y - 4 }}>
            {hover.label} — <span className="v">{hover.val.toLocaleString('en-US')}</span> visits
          </div>
        )}
      </div>
    </div>
  )
}
