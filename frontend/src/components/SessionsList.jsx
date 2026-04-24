import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { ChevronDown, ChevronUp } from 'lucide-react'

/* ------------------------------------------------------------------ */
// Category colours — kept here so the backend doesn't need to know
// about every UI palette tweak.
/* ------------------------------------------------------------------ */
const PALETTE = {
  work: '#8B5CF6', learning: '#10B981', entertainment: '#3B82F6',
  gaming: '#F59E0B', social: '#06B6D4', ai_tools: '#EC4899',
  news: '#84CC16', productivity: '#A78BFA', shopping: '#FBBF24',
  finance: '#34D399', health: '#EF4444', other: '#475569',
}

const LABELS = {
  work: 'Praca', learning: 'Nauka', entertainment: 'Rozrywka',
  gaming: 'Gaming', social: 'Social', ai_tools: 'AI', news: 'News',
  productivity: 'Prod.', shopping: 'Zakupy', finance: 'Finanse',
  health: 'Zdrowie', other: 'Inne',
}

function fmtDur(mins) {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

/* ------------------------------------------------------------------ */
// Tiny stacked bar showing session category mix
/* ------------------------------------------------------------------ */
function CategoryBar({ categories }) {
  return (
    <div className="sess-bar">
      {Object.entries(categories).slice(0, 6).map(([cat, pct]) => (
        <div
          key={cat}
          title={`${LABELS[cat] ?? cat}: ${pct}%`}
          style={{
            flex: pct,
            background: PALETTE[cat] ?? '#475569',
            minWidth: pct > 2 ? 2 : 0,
          }}
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
// Single session row — clickable to expand breakdown
/* ------------------------------------------------------------------ */
function SessionRow({ session, index }) {
  const [open, setOpen] = useState(false)
  const start = parseISO(session.start)
  const end = parseISO(session.end)
  const topCats = Object.entries(session.categories ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
  const isLong = session.duration_minutes >= 60

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.035, duration: 0.35, ease: 'easeOut' }}
      className="session-row"
    >
      <div className="sess-row-top" onClick={() => setOpen((o) => !o)}>
        <div className="sess-time">
          <span>{format(start, 'MMM d, HH:mm')}</span>
          <span className="arrow">→</span>
          <span className="dim">{format(end, 'HH:mm')}</span>
        </div>

        <div className={`sess-dur ${isLong ? 'long' : ''}`}>
          {fmtDur(session.duration_minutes)}
        </div>

        <div className="sess-domain">
          <img
            src={`https://www.google.com/s2/favicons?domain=${session.top_domain}&sz=32`}
            width={14} height={14} alt=""
            onError={(e) => { e.currentTarget.style.opacity = '0' }}
          />
          <span>{session.top_domain}</span>
        </div>

        <CategoryBar categories={session.categories ?? {}} />

        <div className="sess-visits">{session.visit_count}</div>

        <div className="sess-chevron">
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="sess-expand"
          >
            <div className="sess-breakdown">
              <div className="section-label">Breakdown</div>
              <div className="sess-cats">
                {topCats.map(([cat, pct]) => (
                  <div key={cat} className="sess-cat">
                    <div className="dot" style={{ background: PALETTE[cat] ?? '#475569' }} />
                    <span className="cat-name">{LABELS[cat] ?? cat}</span>
                    <div className="cat-track">
                      <div style={{ width: `${pct}%`, background: PALETTE[cat] ?? '#475569' }} />
                    </div>
                    <span className="cat-pct">{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
// Full sessions table with expandable rows + "show more" pagination
/* ------------------------------------------------------------------ */
export default function SessionsList({ sessions }) {
  const [showAll, setShowAll] = useState(false)
  if (!sessions?.length) return null

  const visible = showAll ? sessions : sessions.slice(0, 20)

  return (
    <motion.div
      id="section-sessions"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ delay: 0.56, type: 'spring', stiffness: 55, damping: 20 }}
      className="glass card lift reveal"
      style={{ '--rd': '600ms' }}
    >
      <div className="sess-header">
        <div>
          <h2 className="card-title">Recent Sessions</h2>
          <p className="card-sub">{sessions.length} sessions — click row to expand</p>
        </div>
        <div className="sess-colheads">
          <span>Time</span>
          <span>Dur.</span>
          <span>Top Domain</span>
          <span>Breakdown</span>
          <span style={{ textAlign: 'right' }}>Visits</span>
          <span />
        </div>
      </div>

      {visible.map((s, i) => (
        <SessionRow key={s.start + i} session={s} index={i} />
      ))}

      {sessions.length > 20 && !showAll && (
        <motion.button
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          onClick={() => setShowAll(true)}
          className="sess-more icon-btn"
        >
          Show {sessions.length - 20} more sessions
        </motion.button>
      )}
    </motion.div>
  )
}
