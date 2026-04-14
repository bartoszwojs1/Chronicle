import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useClock, fmtTime, fmtDate } from '../hooks/useClock'
import { Icon } from './Icons'

/* ------------------------------------------------------------------ */
// Floating pill cursor that slides behind the active tab
/* ------------------------------------------------------------------ */
function NavCursor({ position }) {
  return (
    <motion.li
      className="tab-cursor"
      animate={position}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    />
  )
}

function NavTab({ children, setPosition, onClick, active }) {
  const ref = useRef(null)
  return (
    <li
      ref={ref}
      className={'tab' + (active ? ' active' : '')}
      onClick={onClick}
      onMouseEnter={() => {
        if (!ref.current) return
        const { width } = ref.current.getBoundingClientRect()
        setPosition({
          width,
          opacity: 1,
          left: ref.current.offsetLeft,
        })
      }}
    >
      {children}
    </li>
  )
}

function NavTabs({ activeTab, onTabChange }) {
  const [pos, setPos] = useState({ left: 0, width: 0, opacity: 0 })
  const tabs = ['Overview', 'Activity', 'Sites', 'Categories', 'Sessions']
  const ulRef = useRef(null)

  useEffect(() => {
    if (!ulRef.current) return
    const el = ulRef.current.children[activeTab]
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos({
      left: el.offsetLeft,
      width: r.width,
      opacity: 0,
    })
  }, [activeTab])

  return (
    <ul
      ref={ulRef}
      className="nav-tabs"
      onMouseLeave={() => setPos((p) => ({ ...p, opacity: 0 }))}
    >
      {tabs.map((t, i) => (
        <NavTab
          key={t}
          active={i === activeTab}
          onClick={() => onTabChange(i)}
          setPosition={setPos}
        >
          {t}
        </NavTab>
      ))}
      <NavCursor position={pos} />
    </ul>
  )
}

/* ------------------------------------------------------------------ */
// Day-range pills (7d / 30d / 90d / All)
/* ------------------------------------------------------------------ */
function RangePills({ value, onChange }) {
  const opts = [
    { label: '7d', days: 7 },
    { label: '30d', days: 30 },
    { label: '90d', days: 90 },
    { label: 'All', days: 0 },
  ]
  return (
    <div className="range-pills">
      {opts.map((o) => (
        <button
          key={o.label}
          className={value === o.days ? 'on' : ''}
          onClick={() => onChange(o.days)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
// Top nav bar — fixed glass strip with brand, tabs, clock & actions
/* ------------------------------------------------------------------ */
export default function NavHeader({
  days,
  onDaysChange,
  toggleTheme,
  onRefresh,
  onExport,
  loading,
  activeTab,
  onTabChange,
}) {
  const now = useClock()

  return (
    <div className="nav-wrap">
      <div className="nav-bar glass">
        <div className="brand">
          <div className="brand-mark" />
          <div>
            <div className="brand-name">chronicle</div>
            <div className="brand-tag">browser intelligence</div>
          </div>
        </div>

        <div className="nav-tabs-wrap">
          <NavTabs activeTab={activeTab} onTabChange={onTabChange} />
        </div>

        <div className="nav-actions">
          <RangePills value={days} onChange={onDaysChange} />
          <span className="clock">
            <span className="dim">{fmtDate(now)}</span> · {fmtTime(now)}
          </span>
          <button
            className="icon-btn"
            title="Refresh"
            onClick={onRefresh}
            style={loading ? { animation: 'spin 0.9s linear infinite' } : {}}
          >
            <Icon.Refresh />
          </button>
          <button className="icon-btn" title="Export PDF" onClick={onExport}>
            <Icon.Pdf />
          </button>
          <button className="icon-btn" title="Theme" onClick={toggleTheme}>
            <Icon.Sun />
          </button>
        </div>
      </div>
    </div>
  )
}
