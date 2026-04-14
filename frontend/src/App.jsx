import { useEffect, useState, useRef, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { useDashboardData } from './hooks/useDashboardData'
import { initScrollReveal } from './utils/scrollReveal'
import { initTilt } from './utils/cardTilt'
import { exportPDF } from './utils/pdfExport'

import MeshBackground from './components/MeshBackground'
import NavHeader from './components/NavHeader'
import LoadingScreen from './components/LoadingScreen'
import StatCards from './components/StatCards'
import Heatmap from './components/Heatmap'
import DailyTrend from './components/DailyTrend'
import CategoryDonut from './components/CategoryDonut'
import TopSites from './components/TopSites'
import ProductivityByHour from './components/ProductivityByHour'

const SessionsList = lazy(() => import('./components/SessionsList'))

/* ------------------------------------------------------------------ */
// Error placeholder when Chrome's History DB can't be read
/* ------------------------------------------------------------------ */
function ErrorState({ message, onRetry }) {
  return (
    <div className="error-wrap">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass error-box"
      >
        <div className="error-emoji">🔍</div>
        <h2 className="error-title">Chrome history not found</h2>
        <p className="error-body">{message}</p>
        <p className="error-hint">
          Make sure Google Chrome has been opened at least once, then click Retry below.
          <br /><br />
          <code className="error-path">
            ~/Library/Application Support/Google/Chrome/Default/History
          </code>
        </p>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={onRetry}
          className="error-retry"
        >
          Retry
        </motion.button>
      </motion.div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
// Global scroll-parallax + reveal + 3D card tilt
/* ------------------------------------------------------------------ */
function useGlobalEffects() {
  useEffect(() => {
    const cleanupReveal = initScrollReveal()
    const cleanupTilt = initTilt()

    const onScroll = () => {
      document.documentElement.style.setProperty('--scroll-y', window.scrollY + 'px')
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      cleanupReveal()
      cleanupTilt()
      window.removeEventListener('scroll', onScroll)
    }
  }, [])
}

/* ------------------------------------------------------------------ */
// Main app
/* ------------------------------------------------------------------ */
export default function App() {
  const { data, loading, error, days, load, refresh, changeDays } = useDashboardData()
  const [theme, setTheme] = useState('dark')
  const [activeCategory, setActiveCategory] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [loaderDone, setLoaderDone] = useState(false)
  const loadStartRef = useRef(0)

  useGlobalEffects()

  // Kick off the first fetch on mount
  useEffect(() => {
    loadStartRef.current = Date.now()
    load(0)
  }, [load])

  // Keep the loading screen visible for at least 1.2s so it doesn't
  // feel like a flash — even when the API is instant.
  useEffect(() => {
    if (loading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoaderDone(false)
      return
    }
    if (data) {
      const elapsed = Date.now() - loadStartRef.current
      const remaining = Math.max(0, 1200 - elapsed)
      const t = setTimeout(() => setLoaderDone(true), remaining)
      return () => clearTimeout(t)
    }
  }, [loading, data])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const handleRefresh = async () => {
    loadStartRef.current = Date.now()
    setLoaderDone(false)
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }

  const handleCategorySelect = (cat) => {
    setActiveCategory((prev) => (prev === cat ? null : cat))
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    const ids = [
      'section-overview',
      'section-activity',
      'section-sites',
      'section-categories',
      'section-sessions',
    ]
    const el = document.getElementById(ids[tab])
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const summary = data?.summary
  const totalVisits = summary?.total_visits ?? 0
  const uniqueDomains = summary?.unique_domains ?? 0

  return (
    <>
      <MeshBackground theme={theme} />
      <div className="grid-overlay" aria-hidden="true" />
      <div className="noise" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />

      <NavHeader
        days={days}
        onDaysChange={(d) => {
          loadStartRef.current = Date.now()
          setLoaderDone(false)
          changeDays(d)
        }}
        theme={theme}
        toggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onRefresh={handleRefresh}
        onExport={exportPDF}
        loading={loading || refreshing}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      <main className="page" id="dashboard-root">
        <div className="container">
          <header className="page-header reveal" style={{ '--rd': '0ms' }}>
            <div>
              <h1 className="page-title">
                Your <span className="accent">browser</span>, visualised.
              </h1>
              <p className="page-subtitle">
                A weekly look at where your attention went — across{' '}
                {totalVisits.toLocaleString('en-US').replace(/,/g, ' ')} visits and{' '}
                {uniqueDomains.toLocaleString('en-US').replace(/,/g, ' ')} unique domains.
              </p>
            </div>
            <div className="page-meta">
              <div className="live-dot">Live · synced just now</div>
              <div>
                Range · {days === 0 ? 'All' : days + 'd'} · session{' '}
                {new Date().toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </header>

          <AnimatePresence>
            {(!loaderDone || loading) && !data && (
              <motion.div key="loading" exit={{ opacity: 0 }}>
                <LoadingScreen />
              </motion.div>
            )}
          </AnimatePresence>

          {error && !loading && (
            <ErrorState message={error} onRetry={() => load(days)} />
          )}

          <AnimatePresence>
            {data && !error && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: refreshing ? 0.35 : 1 }}
                transition={{ duration: 0.3 }}
              >
                <div id="section-overview">
                  <StatCards summary={data.summary} productivity={data.productivity} />
                </div>

                <div id="section-activity" className="full-row">
                  <Heatmap heatmap={data.heatmap} />
                </div>

                <div className="split-row">
                  <DailyTrend dailyTrend={data.daily_trend} />
                  <div id="section-categories">
                    <CategoryDonut
                      categories={data.categories}
                      activeCategory={activeCategory}
                      onCategorySelect={handleCategorySelect}
                    />
                  </div>
                </div>

                <div className="split-row-2">
                  <div id="section-sites">
                    <TopSites
                      topDomains={data.top_domains}
                      activeCategory={activeCategory}
                    />
                  </div>
                  <ProductivityByHour productivity={data.productivity} />
                </div>

                <div id="section-sessions" className="full-row">
                  <Suspense
                    fallback={
                      <div className="glass card" style={{ padding: 40, textAlign: 'center', color: 'var(--fg-3)' }}>
                        Loading sessions…
                      </div>
                    }
                  >
                    <SessionsList sessions={data.sessions} />
                  </Suspense>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </>
  )
}
