import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { API, apiHeaders } from '../lib/api'
import { IS_DEMO } from '../lib/appMode'

// Mapping module_id backend → route(s) frontend
const MODULE_ROUTE_MAP = {
  customer_profile:      ['/profil-client'],
  invitations:           ['/invitations'],
  stocks_next_edition:   ['/stocks'],
  history:               ['/restitution'],
}

const PackContext = createContext(null)

export function PackProvider({ children }) {
  const [plan,          setPlan]          = useState(null)
  const [lockedRoutes,  setLockedRoutes]  = useState([])
  const [loading,       setLoading]       = useState(true)

  const loadPack = useCallback(() => {
    if (IS_DEMO) {
      setLoading(false)
      return
    }
    fetch(`${API}/api/pack`, { headers: apiHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        setPlan(data)
        const locked = (data.locked_modules ?? []).flatMap(m => MODULE_ROUTE_MAP[m] ?? [])
        setLockedRoutes(locked)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadPack() }, [loadPack])

  function isLocked(route) {
    return lockedRoutes.includes(route)
  }

  /**
   * Retourne {used, max, remaining, ok} pour un type de quota.
   * type : 'events' | 'editions' | 'ai_reports'
   */
  function quotaFor(type) {
    if (!plan || IS_DEMO) return { used: 0, max: 999, remaining: 999, ok: true }
    const ext = plan.extensions ?? {}
    const map = {
      events:     { used: plan.used_events,          max: plan.included_events          + (ext.events_extra      ?? 0) },
      editions:   { used: plan.used_active_editions, max: plan.included_active_editions + (ext.editions_extra     ?? 0) },
      ai_reports: { used: plan.used_ai_reports,      max: plan.included_ai_reports      + (ext.ai_reports_extra   ?? 0) },
    }
    const q = map[type] ?? { used: 0, max: 999 }
    return { ...q, remaining: Math.max(0, q.max - q.used), ok: q.used < q.max }
  }

  /**
   * Incrémente un compteur côté backend et recharge le pack.
   * field : 'used_events' | 'used_active_editions'
   */
  async function incrementQuota(field) {
    if (IS_DEMO) return
    try {
      await fetch(`${API}/api/quota/increment`, {
        method: 'POST',
        headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ field }),
      })
      loadPack()
    } catch { /* silencieux */ }
  }

  return (
    <PackContext.Provider value={{ plan, lockedRoutes, isLocked, loading, quotaFor, incrementQuota, refreshPack: loadPack }}>
      {children}
    </PackContext.Provider>
  )
}

export function usePack() {
  return useContext(PackContext) ?? {
    plan: null,
    lockedRoutes: [],
    isLocked:       () => false,
    loading:        false,
    quotaFor:       () => ({ used: 0, max: 999, remaining: 999, ok: true }),
    incrementQuota: async () => {},
    refreshPack:    () => {},
  }
}
