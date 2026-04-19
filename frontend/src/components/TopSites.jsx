import { useState } from 'react'
import { seeded } from '../utils/seededRng'
import { Icon } from './Icons'

const CHART_PALETTE = [
  'oklch(82% 0.16 170)', 'oklch(82% 0.13 200)', 'oklch(78% 0.14 280)',
  'oklch(78% 0.14 30)', 'oklch(82% 0.16 170)', 'oklch(78% 0.14 60)',
  'oklch(78% 0.14 60)', 'oklch(78% 0.14 30)', 'oklch(78% 0.14 220)',
  'oklch(78% 0.14 100)', 'oklch(70% 0.06 200)', 'oklch(82% 0.14 320)',
]

/* ------------------------------------------------------------------ */
// Tiny SVG sparkline seeded from the row index so it stays stable
/* ------------------------------------------------------------------ */
function Sparkline({ seed = 1, color = 'currentColor' }) {
  const r = seeded(seed * 13)
  const pts = Array.from({ length: 14 }, () => 6 + r() * 18)
  const w = 80, h = 24
  const sx = w / (pts.length - 1)
  const max = Math.max(...pts), min = Math.min(...pts)
  const sy = (h - 4) / Math.max(1, max - min)
  let d = ''
  pts.forEach((v, i) => {
    const x = i * sx
    const y = h - 2 - (v - min) * sy
    d += (i ? ' L ' : 'M ') + x.toFixed(1) + ' ' + y.toFixed(1)
  })
  return (
    <svg className="site-mini" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  )
}

function Favicon({ domain }) {
  const initial = domain.slice(0, 2).toUpperCase()
  return <div className="site-fav">{initial}</div>
}

/* ------------------------------------------------------------------ */
// Top sites list with search + sparklines
/* ------------------------------------------------------------------ */
export default function TopSites({ topDomains, activeCategory }) {
  const [filter, setFilter] = useState('')

  if (!topDomains?.length) return null

  const filtered = topDomains
    .map((d, i) => ({ ...d, color: CHART_PALETTE[i % CHART_PALETTE.length] }))
    .filter((d) => {
      const matchSearch = !filter || d.domain.toLowerCase().includes(filter.toLowerCase())
      const matchCat = !activeCategory || d.category === activeCategory
      return matchSearch && matchCat
    })

  return (
    <div className="glass card lift reveal" style={{ '--rd': '500ms' }}>
      <div className="sites-head">
        <div>
          <h3 className="card-title">Top sites</h3>
          <p className="card-sub">Most visited domains this period</p>
        </div>
        <label className="search">
          <Icon.Search />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter domains…"
          />
        </label>
      </div>

      <div>
        {filtered.map((s, i) => (
          <div key={s.domain} className="site-row" style={{ animation: `rowIn .6s cubic-bezier(.2,.8,.2,1) ${i * 60}ms both` }}>
            <Favicon domain={s.domain} />
            <div>
              <div className="site-name">{s.domain}</div>
              <div className="site-host">{s.domain}</div>
            </div>
            <Sparkline seed={i + 3} color={s.color} />
            <div className="site-visits">{s.count.toLocaleString('en-US').replace(/,/g, ' ')}</div>
            <Icon.Up style={{ transform: 'rotate(45deg)', color: 'var(--fg-3)', width: 14, height: 14 }} />
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="no-results">
            No domains match &ldquo;{filter}&rdquo;
          </div>
        )}
      </div>
      <style>{`@keyframes rowIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }`}</style>
    </div>
  )
}
