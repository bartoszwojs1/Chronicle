import { useState } from 'react'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/* ------------------------------------------------------------------ */
// 7×24 activity heatmap — colour intensity maps to visit count
/* ------------------------------------------------------------------ */
export default function Heatmap({ heatmap }) {
  const [hover, setHover] = useState(null)

  if (!heatmap) return null

  let max = 0
  for (let d = 0; d < 7; d++)
    for (let h = 0; h < 24; h++)
      max = Math.max(max, heatmap[d]?.[h] ?? 0)

  const colorFor = (v) => {
    const a = max === 0 ? 0.1 : 0.10 + (v / max) * 0.85
    return `color-mix(in oklch, var(--accent) ${Math.round(a * 100)}%, transparent)`
  }

  return (
    <div className="glass card lift reveal" style={{ '--rd': '320ms' }}>
      <div className="card-head">
        <div>
          <h3 className="card-title">Activity heatmap</h3>
          <p className="card-sub">Visits by day &amp; hour of week</p>
        </div>
        <div className="heatmap-legend">
          <span>less</span>
          {[0.15, 0.35, 0.55, 0.78, 0.95].map((v, i) => (
            <span key={i} className="lg-cell" style={{ background: colorFor(v * max) }} />
          ))}
          <span>more</span>
        </div>
      </div>

      <div className="heatmap" style={{ position: 'relative' }}>
        <div />
        <div className="heatmap-hours">
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h}>{h % 4 === 0 ? String(h).padStart(2, '0') : ''}</span>
          ))}
        </div>
        {DAYS.map((day, di) => (
          <div key={day} style={{ display: 'contents' }}>
            <div className="heatmap-day">{day}</div>
            <div className="heatmap-row">
              {Array.from({ length: 24 }, (_, hi) => {
                const v = heatmap[di]?.[hi] ?? 0
                return (
                  <div
                    key={hi}
                    className="heatmap-cell"
                    style={{
                      background: colorFor(v),
                      animation: `cellIn .8s cubic-bezier(.2,.8,.2,1) ${(di * 24 + hi) * 6}ms both`,
                    }}
                    onMouseEnter={(e) => setHover({ d: day, h: hi, v, x: e.clientX, y: e.clientY })}
                    onMouseMove={(e) => setHover((p) => p ? { ...p, x: e.clientX, y: e.clientY } : null)}
                    onMouseLeave={() => setHover(null)}
                  />
                )
              })}
            </div>
          </div>
        ))}
        <style>{`
          @keyframes cellIn {
            from { opacity: 0; transform: scale(.4); }
            to   { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>

      {hover && (
        <div className="tooltip on" style={{ left: hover.x, top: hover.y, position: 'fixed' }}>
          {hover.d} · {String(hover.h).padStart(2, '0')}:00 — <span className="v">{hover.v}</span> visits
        </div>
      )}
    </div>
  )
}
