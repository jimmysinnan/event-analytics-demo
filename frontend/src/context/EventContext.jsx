/**
 * EventContext — remplace EditionContext
 * Expose : organisation active, événement actif, édition active, année active
 * Rétrocompatible : useEdition() fonctionne toujours sur les pages existantes
 */

import { createContext, useContext, useState, useEffect } from 'react'
import {
  initStore,
  getOrganisations,
  getEvents,
  getEditions,
  getEdition,
  saveEdition,
  saveEvent,
  getChannels, saveChannel as saveChannelStore, deleteChannel as deleteChannelStore,
  getEditionSettings, saveEditionSettings as saveSettingsStore,
  getTheme, saveTheme as saveThemeStore,
} from '../store/eventStore'
import { createEvent, createEdition, RECOMMENDED_MODULES, createChannel, createEditionSettings, createEventTheme } from '../lib/models'

const EventContext = createContext(null)

export function EventProvider({ children }) {
  const [orgs,        setOrgs]        = useState([])
  const [events,      setEvents]      = useState([])
  const [editions,    setEditions]    = useState([])
  const [activeOrgId,   setActiveOrgId]   = useState(null)
  const [activeEventId, setActiveEventId] = useState(null)
  const [activeEditionId, setActiveEditionId] = useState(null)
  const [channels, setChannels] = useState([])
  const [editionSettings, setEditionSettings] = useState(null)
  const [theme, setThemeState] = useState(null)

  // Init au montage
  useEffect(() => {
    initStore()
    refresh()
  }, [])

  // Recharger canaux + thème quand l'édition active change
  useEffect(() => {
    if (!activeEditionId) return
    setChannels(getChannels(activeEditionId))
    setEditionSettings(getEditionSettings(activeEditionId))
    setThemeState(getTheme(activeEditionId) ?? createEventTheme({ editionId: activeEditionId }))
  }, [activeEditionId])

  function refresh() {
    const o = getOrganisations()
    const ev = getEvents()
    const ed = getEditions()
    setOrgs(o)
    setEvents(ev)
    setEditions(ed)

    if (!activeOrgId && o.length)  setActiveOrgId(o[0].id)
    if (!activeEventId && ev.length) setActiveEventId(ev[0].id)
    if (!activeEditionId && ed.length) {
      const active = ed.find(e => e.status === 'active') ?? ed.sort((a,b) => b.year - a.year)[0]
      if (active) setActiveEditionId(active.id)
    }

    // Load channels, settings and theme for active edition
    if (activeEditionId) {
      setChannels(getChannels(activeEditionId))
      setEditionSettings(getEditionSettings(activeEditionId))
      setThemeState(getTheme(activeEditionId) ?? createEventTheme({ editionId: activeEditionId }))
    }
  }

  function updateTheme(patch) {
    const current = theme ?? createEventTheme({ editionId: activeEditionId })
    const updated = { ...current, ...patch, editionId: activeEditionId }
    saveThemeStore(activeEditionId, updated)
    setThemeState(updated)
    return updated
  }

  const activeOrg     = orgs.find(o => o.id === activeOrgId)     ?? orgs[0]     ?? null
  const activeEvent   = events.find(e => e.id === activeEventId) ?? events[0]   ?? null
  const activeEdition = editions.find(e => e.id === activeEditionId)
    ?? editions.filter(e => e.eventId === activeEvent?.id).sort((a,b) => b.year - a.year)[0]
    ?? null

  const activeYear = activeEdition?.year ?? new Date().getFullYear()

  // Éditions de l'événement actif, triées par année desc
  const eventEditions = editions
    .filter(e => e.eventId === activeEvent?.id)
    .sort((a, b) => b.year - a.year)

  function setActiveYear(year) {
    const ed = editions.find(e => e.eventId === activeEvent?.id && e.year === year)
    if (ed) setActiveEditionId(ed.id)
  }

  function addEvent(data) {
    const ev = saveEvent(createEvent({ ...data, orgId: activeOrg?.id }))
    setEvents(getEvents())
    setActiveEventId(ev.id)
    return ev
  }

  function addEdition(data) {
    const ed = saveEdition(createEdition({ ...data, eventId: activeEvent?.id }))
    setEditions(getEditions())
    setActiveEditionId(ed.id)
    return ed
  }

  function updateEdition(id, patch) {
    const ed = getEdition(id)
    if (!ed) return
    const updated = saveEdition({ ...ed, ...patch })
    setEditions(getEditions())
    return updated
  }

  function addChannel(data) {
    const ch = saveChannelStore(createChannel({ ...data, editionId: activeEditionId }))
    setChannels(getChannels(activeEditionId))
    return ch
  }

  function removeChannel(id) {
    deleteChannelStore(id)
    setChannels(getChannels(activeEditionId))
  }

  function updateEditionSettings(patch) {
    const current = editionSettings ?? createEditionSettings({ editionId: activeEditionId })
    const updated = { ...current, ...patch, editionId: activeEditionId }
    saveSettingsStore(activeEditionId, updated)
    setEditionSettings(updated)
    return updated
  }

  // ── Rétrocompatibilité useEdition() ───────────────────────────────────────
  // Les pages existantes appellent useEdition() et attendent { year, setYear, edition, editions }
  const legacyEditions = eventEditions.map(e => ({
    year:      e.year,
    label:     String(e.year),
    available: e.modules ?? [],
    ...e,
  }))

  return (
    <EventContext.Provider value={{
      // Nouveau modèle
      orgs, events, editions, eventEditions,
      activeOrg, activeEvent, activeEdition, activeYear,
      setActiveOrgId, setActiveEventId, setActiveEditionId,
      addEvent, addEdition, updateEdition, refresh,
      channels, setChannels, addChannel, removeChannel,
      editionSettings, updateEditionSettings,
      theme, updateTheme,

      // Rétrocompat useEdition()
      year:     activeYear,
      setYear:  setActiveYear,
      edition:  activeEdition
        ? { year: activeYear, label: String(activeYear), available: activeEdition.modules ?? [], ...activeEdition }
        : null,
    }}>
      {children}
    </EventContext.Provider>
  )
}

export function useEventContext() {
  const ctx = useContext(EventContext)
  if (!ctx) throw new Error('useEventContext must be inside EventProvider')
  return ctx
}

// Alias rétrocompat — les pages existantes importent useEdition depuis EditionContext
export function useEdition() {
  return useEventContext()
}
