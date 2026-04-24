import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const STEPS = [
  'Reading Chrome history',
  'Parsing visits',
  'Building visualisations',
  'Almost there',
]

/* ------------------------------------------------------------------ */
// Decryption-style scramble: characters randomise then resolve left-to-right
/* ------------------------------------------------------------------ */
function ScrambleText({ text, active }) {
  const [display, setDisplay] = useState(text)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

  useEffect(() => {
    if (!active) return
    let frame = 0
    const totalFrames = 20
    const interval = setInterval(() => {
      frame++
      if (frame >= totalFrames) {
        setDisplay(text)
        clearInterval(interval)
        return
      }
      const progress = frame / totalFrames
      setDisplay(
        text
          .split('')
          .map((c, i) => {
            if (c === ' ') return ' '
            if (i < text.length * progress) return text[i]
            return chars[Math.floor(Math.random() * chars.length)]
          })
          .join('')
      )
    }, 30)
    return () => clearInterval(interval)
  }, [text, active])

  return <span>{display}</span>
}

/* ------------------------------------------------------------------ */
// Full-screen loader shown while the backend parses Chrome's SQLite DB
/* ------------------------------------------------------------------ */
export default function LoadingScreen() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 800),
      setTimeout(() => setStep(2), 1800),
      setTimeout(() => setStep(3), 3200),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="glass"
      style={{
        maxWidth: 420,
        margin: '120px auto',
        padding: '48px 40px',
        textAlign: 'center',
      }}
    >
      <div className="brand-mark" style={{ margin: '0 auto 28px', width: 40, height: 40 }} />

      <div style={{ height: 32, marginBottom: 24 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            style={{
              fontFamily: 'Geist Mono, monospace',
              fontSize: 13,
              color: 'var(--fg)',
              letterSpacing: '0.04em',
            }}
          >
            <ScrambleText text={STEPS[step]} active />
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        style={{
          width: '100%',
          height: 3,
          borderRadius: 2,
          background: 'rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ width: '5%' }}
          animate={{ width: `${15 + step * 28}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            height: '100%',
            borderRadius: 2,
            background: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
            boxShadow: '0 0 12px color-mix(in oklch, var(--accent) 50%, transparent)',
          }}
        />
      </div>

      <div
        style={{
          marginTop: 16,
          fontFamily: 'Geist Mono, monospace',
          fontSize: 11,
          color: 'var(--fg-3)',
          letterSpacing: '0.06em',
        }}
      >
        {step < 3 ? 'Syncing from Chrome…' : 'Rendering dashboard…'}
      </div>
    </motion.div>
  )
}
