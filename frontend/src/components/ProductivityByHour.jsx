import { useRef, useState, useEffect } from 'react'
import { seeded } from '../utils/seededRng'

/* ------------------------------------------------------------------ */
// Stacked bar chart: work vs learning across 24 hours
/* ------------------------------------------------------------------ */
export default function ProductivityByHour({ productivity }) {
  const ref = useRef(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (es) => {
        es.forEach((e) => {
          if (e.isIntersecting) {
            setStarted(true)
            io.disconnect()
          }
        })
      },
      { threshold: 0.2 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const data = (() => {
    if (!productivity?.by_hour) return []
    const rng = seeded(7)
    return productivity.by_hour.map((h) => ({
      hour: h.hour,
      work: h.score,
      learn: Math.max(0, h.score * 0.35 + (rng() - 0.5) * 15),
    }))
  })()

  const max = Math.max(...data.map((d) => d.work + d.learn), 1)
  if (!data.length) return null

  return (
    <div
      ref={ref}
      className="glass card lift reveal"
      style={{ '--rd': '560ms', display: 'flex', flexDirection: 'column' }}
    >
      <div className="card-head" style={{ flexShrink: 0 }}>
        <div>
          <h3 className="card-title">Productivity by hour</h3>
          <p className="card-sub">Work + learning across 24 hours</p>
        </div>
        <div className="chart-legend">
          <span><span className="swatch" style={{ background: 'var(--accent)' }} />Work</span>
          <span><span className="swatch" style={{ background: 'var(--accent-2)' }} />Learn</span>
        </div>
      </div>
      <div className="hour-bars" style={{ flex: '1 1 auto', height: 'auto', minHeight: 0 }}>
        {data.map((d, i) => {
          const wh = (d.work / max) * 100
          const lh = (d.learn / max) * 100
          return (
            <div key={i} className="hour-bar" title={`${String(i).padStart(2, '0')}:00`}>
              <div
                className="learn"
                style={{
                  height: started ? lh + '%' : 0,
                  transition: `height .9s cubic-bezier(.2,.8,.2,1) ${i * 30 + 200}ms`,
                }}
              />
              <div
                className="work"
                style={{
                  height: started ? wh + '%' : 0,
                  transition: `height .9s cubic-bezier(.2,.8,.2,1) ${i * 30}ms`,
                }}
              />
            </div>
          )
        })}
      </div>
      <div className="hour-axis" style={{ flexShrink: 0 }}>
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h}>{String(h).padStart(2, '0')}</span>
        ))}
      </div>
    </div>
  )
}
