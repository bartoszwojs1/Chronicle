import { useState, useCallback, useRef } from 'react'

const BASE = '/api'

export function useDashboardData() {
  const [data, setData]       = useState(null)
  const [status, setStatus]   = useState(null)   // from /api/status
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [days, setDays]       = useState(0)
  const abortRef              = useRef(null)

  const load = useCallback(async (nextDays = days) => {
    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    const signal = abortRef.current.signal

    setLoading(true)
    setError(null)

    try {
      const url = nextDays > 0
        ? `${BASE}/stats?days=${nextDays}`
        : `${BASE}/stats`

      const [statsRes, statusRes] = await Promise.all([
        fetch(url, { signal }),
        fetch(`${BASE}/status`, { signal }),
      ])

      if (!statsRes.ok) {
        const body = await statsRes.json().catch(() => ({}))
        throw new Error(body.detail || `HTTP ${statsRes.status}`)
      }

      const [statsJson, statusJson] = await Promise.all([
        statsRes.json(),
        statusRes.json(),
      ])

      setData(statsJson)
      setStatus(statusJson)
      setDays(nextDays)
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [days])

  const refresh = useCallback(async () => {
    await fetch(`${BASE}/refresh`).catch(() => {})
    await load(days)
  }, [load, days])

  const changeDays = useCallback((d) => {
    setDays(d)
    load(d)
  }, [load])

  return { data, status, loading, error, days, load, refresh, changeDays }
}
