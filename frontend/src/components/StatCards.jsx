import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icons'

/* ------------------------------------------------------------------ */
// Animated number that counts up from zero when it scrolls into view
/* ------------------------------------------------------------------ */
function useCountUp(target, { duration = 1400, decimals = 0, start = false } = {}) {
  const [val, setVal] = useState(target)

  useEffect(() => {
    if (!start) return
    let raf
    const t0 = performance.now()
    const ease = (t) => 1 - Math.pow(1 - t, 3)

    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration)
      setVal(target * ease(p))
      if (p < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    const safety = setTimeout(() => setVal(target), duration + 200)
    return () => { cancelAnimationFrame(raf); clearTimeout(safety) }
  }, [target, duration, start])

  const formatted = decimals
    ? val.toFixed(decimals)
    : Math.round(val).toLocaleString('en-US').replace(/,/g, ' ')
  return formatted
}

function StatNumber({ value, decimals = 0, suffix = '', start }) {
  const text = useCountUp(value, { duration: 1600, decimals, start })
  return <span className="scramble">{text}{suffix}</span>
}

/* ------------------------------------------------------------------ */
// Single stat card — icon, big number, optional delta badge
/* ------------------------------------------------------------------ */
function StatCard({ icon, value, label, delta, deltaDir, suffix = '', decimals = 0, delay = 0 }) {
  const ref = useRef(null)
  const [start, setStart] = useState(false)
  const I = icon

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { setStart(true); io.disconnect() } })
    }, { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className="glass lift glow-hover stat reveal"
      style={{ '--rd': delay + 'ms' }}
    >
      <span className="glow-ring" />
      <div className="stat-top">
        <div className="stat-icon"><I /></div>
        {delta != null && (
          <div className={'stat-delta ' + (deltaDir === 'up' ? 'up' : 'down')}>
            {deltaDir === 'up' ? <Icon.Up /> : <Icon.Down />}
            {delta}
          </div>
        )}
      </div>
      <div className="stat-value">
        <StatNumber value={value} decimals={decimals} suffix={suffix} start={start} />
      </div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
// Productivity ring — SVG stroke animation driven by IntersectionObserver
/* ------------------------------------------------------------------ */
function ProductivityRing({ value = 0, grade = 'D', delay = 0 }) {
  const ref = useRef(null)
  const [start, setStart] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { setStart(true); io.disconnect() } })
    }, { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const r = 36
  const c = 2 * Math.PI * r
  const dash = start ? c * (value / 100) : 0
  const numText = useCountUp(value, { duration: 1600, start })

  return (
    <div
      ref={ref}
      className="glass lift glow-hover stat reveal"
      style={{ '--rd': delay + 'ms' }}
    >
      <span className="glow-ring" />
      <div className="stat-top">
        <div className="stat-icon"><Icon.Bolt /></div>
        <div className="stat-delta down">Grade {grade}</div>
      </div>
      <div className="ring-stat" style={{ marginTop: 18 }}>
        <div className="ring-wrap">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
            <circle
              cx="50" cy="50" r={r}
              fill="none"
              stroke="url(#ringGrad)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c}`}
              style={{ transition: 'stroke-dasharray 1.6s cubic-bezier(.2,.8,.2,1)' }}
            />
            <defs>
              <linearGradient id="ringGrad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="oklch(82% 0.16 170)" />
                <stop offset="100%" stopColor="oklch(82% 0.13 200)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="num">{numText}</div>
        </div>
        <div>
          <div className="stat-value" style={{ fontSize: 38, margin: '0 0 4px' }}>
            <StatNumber value={value} suffix="%" start={start} />
          </div>
          <div className="stat-label">Productivity score</div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
// Row of four stat cards: visits, domains, daily avg, productivity
/* ------------------------------------------------------------------ */
export default function StatCards({ summary, productivity }) {
  if (!summary) return null

  const { total_visits, unique_domains, avg_daily_visits, week_over_week_change_pct } = summary
  const score = productivity?.score ?? 0
  const grade = productivity?.grade ?? 'D'
  const wow = week_over_week_change_pct ?? 0

  return (
    <div className="stat-row">
      <StatCard
        icon={Icon.Globe}
        value={total_visits}
        label="Total visits"
        delta={`${wow > 0 ? '+' : ''}${wow.toFixed(1)}%`}
        deltaDir={wow >= 0 ? 'up' : 'down'}
        delay={50}
      />
      <StatCard
        icon={Icon.Stack}
        value={unique_domains}
        label="Unique domains"
        delay={120}
      />
      <StatCard
        icon={Icon.Trend}
        value={Math.round(avg_daily_visits)}
        label="Avg daily visits"
        delay={190}
      />
      <ProductivityRing value={Math.round(score)} grade={grade} delay={260} />
    </div>
  )
}
