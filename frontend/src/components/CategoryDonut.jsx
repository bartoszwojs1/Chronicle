import { useState, useRef, useEffect } from 'react'

const CHART_PALETTE = [
  'oklch(82% 0.16 170)', 'oklch(82% 0.13 200)', 'oklch(78% 0.14 30)',
  'oklch(78% 0.14 60)', 'oklch(78% 0.14 280)', 'oklch(78% 0.14 320)',
  'oklch(78% 0.14 220)', 'oklch(78% 0.14 100)', 'oklch(70% 0.06 200)',
]

// Build SVG arc paths for a donut ring (inner r=70, outer R=92)
function buildPaths(data, total) {
  const r = 70, R = 92, cx = 100, cy = 100
  return data.reduce((out, c) => {
    const prev = out[out.length - 1]
    const acc = prev ? prev.acc : 0
    const angle = (c.count / total) * Math.PI * 2
    const a0 = acc - Math.PI / 2
    const a1 = a0 + angle
    const large = angle > Math.PI ? 1 : 0
    const x0 = cx + Math.cos(a0) * R
    const y0 = cy + Math.sin(a0) * R
    const x1 = cx + Math.cos(a1) * R
    const y1 = cy + Math.sin(a1) * R
    const x2 = cx + Math.cos(a1) * r
    const y2 = cy + Math.sin(a1) * r
    const x3 = cx + Math.cos(a0) * r
    const y3 = cy + Math.sin(a0) * r
    out.push({
      d: `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${r} ${r} 0 ${large} 0 ${x3} ${y3} Z`,
      acc: acc + angle,
    })
    return out
  }, []).map((p) => p.d)
}

/* ------------------------------------------------------------------ */
// Interactive donut + category list.  Clicking a slice filters the
// rest of the dashboard by that category.
/* ------------------------------------------------------------------ */
export default function CategoryDonut({ categories, activeCategory, onCategorySelect }) {
  const [active, setActive] = useState(null)
  const ref = useRef(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { setStarted(true); io.disconnect() } })
    }, { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const data = (categories ?? []).map((d, i) => ({
    ...d,
    color: d.color || CHART_PALETTE[i % CHART_PALETTE.length],
  }))

  const total = data.reduce((a, b) => a + b.count, 0)
  const paths = buildPaths(data, total)

  if (!data.length) return null

  const activeIndex = active != null
    ? active
    : (activeCategory ? data.findIndex((d) => d.category === activeCategory) : null)

  return (
    <div ref={ref} className="glass card lift reveal" style={{ '--rd': '440ms' }}>
      <div className="card-head">
        <div>
          <h3 className="card-title">Categories</h3>
          <p className="card-sub">Click a row to filter all charts</p>
        </div>
      </div>

      <div className="donut-row">
        <div className="donut-wrap" style={{ width: 200, height: 200 }}>
          <svg viewBox="0 0 200 200">
            {data.map((c, i) => {
              const isHover = activeIndex === i
              const off = isHover ? 4 : 0
              const ox = off ? Math.cos((i / data.length) * Math.PI * 2 - Math.PI / 2) * off : 0
              const oy = off ? Math.sin((i / data.length) * Math.PI * 2 - Math.PI / 2) * off : 0
              return (
                <path
                  key={i}
                  d={paths[i]}
                  fill={c.color}
                  opacity={started ? (activeIndex == null || isHover ? 1 : 0.45) : 0}
                  style={{ transition: 'opacity .4s, transform .3s', cursor: 'pointer', transform: `translate(${ox}px, ${oy}px)` }}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onClick={() => onCategorySelect(c.category)}
                />
              )
            })}
          </svg>
          <div className="donut-center">
            <div>
              <div className="big">
                {activeIndex != null
                  ? `${data[activeIndex].percentage.toFixed(1)}%`
                  : total.toLocaleString('en-US').replace(/,/g, ' ')}
              </div>
              <div className="lbl">{activeIndex != null ? data[activeIndex].label : 'total visits'}</div>
            </div>
          </div>
        </div>

        <div className="cat-list">
          {data.map((c, i) => (
            <div
              key={c.category}
              className={'cat-row' + (activeIndex === i ? ' active' : '')}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onClick={() => onCategorySelect(c.category)}
            >
              <span className="dot" style={{ background: c.color }} />
              <span>{c.label}</span>
              <span className="pct">{c.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
