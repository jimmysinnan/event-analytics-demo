/**
 * Store persistant — localStorage
 * Architecture : Organisation → Event → Edition
 * Prépare la migration future vers un backend (Supabase / SQLite)
 */

import { createOrganisation, createEvent, createEdition, RECOMMENDED_MODULES } from '../lib/models'

const KEYS = {
  orgs:      'ea_organisations',
  events:    'ea_events',
  editions:  'ea_editions',
  cse:       'ea_cse',               // { [editionId]: { current, history[] } }
  channels:  'ea_channels',          // [{ id, editionId, name, type, color, active, createdAt }]
  themes:    'ea_themes',            // [{ editionId, imageUrl, primary, ... }]
  settings:  'ea_edition_settings',  // [{ editionId, vipKeywords, invitKeywords, tarifZoneMap, createdAt }]
}

// ── Lecture / écriture ─────────────────────────────────────────────────────────
function load(key)       { try { return JSON.parse(localStorage.getItem(key) ?? '[]') } catch { return [] } }
function save(key, data) { localStorage.setItem(key, JSON.stringify(data)) }

// ── Seed données de démo ───────────────────────────────────────────────────────
function seedDemoData() {
  const org = createOrganisation({ id: 'org-demo', name: 'ADI Events (Démo)' })

  const event = createEvent({
    id:      'evt-festival-demo',
    orgId:   org.id,
    name:    'Festival Client',
    type:    'festival',
    description: 'Festival événementiel annuel — données de démonstration',
    modules: RECOMMENDED_MODULES.festival,
  })

  const editions = [
    createEdition({
      id: 'edi-2023', eventId: event.id,
      name: 'Festival Client 2023', year: 2023,
      status: 'completed',
      jaugeEst: 28000, caEst: 800000,
      modules: ['consommation'],
    }),
    createEdition({
      id: 'edi-2024', eventId: event.id,
      name: 'Festival Client 2024', year: 2024,
      status: 'completed',
      jaugeEst: 24000, caEst: 750000,
      modules: ['billetterie', 'consommation'],
    }),
    createEdition({
      id: 'edi-2025', eventId: event.id,
      name: 'Festival Client 2025', year: 2025,
      status: 'completed',
      jaugeEst: 20000, caEst: 600000,
      modules: ['billetterie', 'consommation', 'profil', 'invitations', 'stocks'],
    }),
    createEdition({
      id: 'edi-2026', eventId: event.id,
      name: 'Festival Client 2026', year: 2026,
      status: 'upcoming',
      jaugeEst: 22000, caEst: 650000,
      modules: RECOMMENDED_MODULES.festival,
    }),
  ]

  save(KEYS.orgs,     [org])
  save(KEYS.events,   [event])
  save(KEYS.editions, editions)
}

// ── Init (seed si vide) ────────────────────────────────────────────────────────
export function initStore() {
  if (load(KEYS.orgs).length === 0) seedDemoData()
}

// ── CRUD Organisations ─────────────────────────────────────────────────────────
export function getOrganisations()       { return load(KEYS.orgs) }
export function saveOrganisation(org)    {
  const list = load(KEYS.orgs).filter(o => o.id !== org.id)
  save(KEYS.orgs, [...list, org])
  return org
}

// ── CRUD Events ───────────────────────────────────────────────────────────────
export function getEvents(orgId = null) {
  const all = load(KEYS.events)
  return orgId ? all.filter(e => e.orgId === orgId) : all
}
export function getEvent(id)            { return load(KEYS.events).find(e => e.id === id) ?? null }
export function saveEvent(event)        {
  const list = load(KEYS.events).filter(e => e.id !== event.id)
  save(KEYS.events, [...list, event])
  return event
}
export function archiveEvent(id)        {
  const event = getEvent(id)
  if (event) saveEvent({ ...event, archived: true })
}

// ── CRUD Editions ─────────────────────────────────────────────────────────────
export function getEditions(eventId = null) {
  const all = load(KEYS.editions)
  return eventId ? all.filter(e => e.eventId === eventId) : all
}
export function getEdition(id)          { return load(KEYS.editions).find(e => e.id === id) ?? null }
export function saveEdition(edition)    {
  const list = load(KEYS.editions).filter(e => e.id !== edition.id)
  save(KEYS.editions, [...list, edition])
  return edition
}

// ── Utilitaire: édition active par année (compatibilité EditionContext) ────────
// ── CSE par édition — avec historique ─────────────────────────────────────────

const CSE_DEFAULT = { vendus: 0, montant: 0, objectif: 2500, note: '' }
const CSE_HISTORY_MAX = 20   // nb max d'entrées dans l'historique

function loadCseStore() {
  try { return JSON.parse(localStorage.getItem(KEYS.cse) ?? '{}') } catch { return {} }
}
function saveCseStore(store) { localStorage.setItem(KEYS.cse, JSON.stringify(store)) }

export function getCse(editionId) {
  if (!editionId) return { current: { ...CSE_DEFAULT }, history: [] }
  const store = loadCseStore()
  return store[editionId] ?? { current: { ...CSE_DEFAULT }, history: [] }
}

/**
 * Sauvegarde les données CSE pour une édition.
 * L'état précédent est poussé dans l'historique (pour undo).
 */
export function saveCse(editionId, newData) {
  if (!editionId) return
  const store   = loadCseStore()
  const current = store[editionId] ?? { current: { ...CSE_DEFAULT }, history: [] }

  // Pousser l'état actuel dans l'historique avant écrasement
  const history = [
    { ...current.current, _savedAt: new Date().toISOString() },
    ...(current.history ?? []),
  ].slice(0, CSE_HISTORY_MAX)

  store[editionId] = {
    current:   { ...newData, _savedAt: new Date().toISOString() },
    history,
  }
  saveCseStore(store)
}

/**
 * Restaure le dernier état sauvegardé (undo).
 * Retourne le nouvel état courant, ou null si historique vide.
 */
export function undoCse(editionId) {
  if (!editionId) return null
  const store   = loadCseStore()
  const entry   = store[editionId]
  if (!entry?.history?.length) return null

  const [previous, ...rest] = entry.history
  store[editionId] = { current: previous, history: rest }
  saveCseStore(store)
  return previous
}

export function clearCse(editionId) {
  if (!editionId) return
  const store = loadCseStore()
  store[editionId] = { current: { ...CSE_DEFAULT }, history: [] }
  saveCseStore(store)
}

// ── Channels (canaux de distribution) ────────────────────────────────────────

export function getChannels(editionId = null) {
  const all = load(KEYS.channels)
  const active = all.filter(c => c.active !== false)
  return editionId ? active.filter(c => c.editionId === editionId) : active
}

export function saveChannel(channel) {
  const list = load(KEYS.channels).filter(c => c.id !== channel.id)
  save(KEYS.channels, [...list, channel])
  return channel
}

export function deleteChannel(channelId) {
  const list = load(KEYS.channels)
  save(KEYS.channels, list.map(c => c.id === channelId ? { ...c, active: false } : c))
}

// ── Thème événementiel par édition ────────────────────────────────────────────

export function getTheme(editionId) {
  if (!editionId) return null
  return (load(KEYS.themes)).find(t => t.editionId === editionId) ?? null
}

export function saveTheme(editionId, theme) {
  const all = load(KEYS.themes).filter(t => t.editionId !== editionId)
  save(KEYS.themes, [...all, { editionId, ...theme }])
}

// ── Paramètres par édition (mots-clés VIP, mapping tarifs) ────────────────────

export function getEditionSettings(editionId) {
  if (!editionId) return null
  return (load(KEYS.settings)).find(s => s.editionId === editionId) ?? null
}

export function saveEditionSettings(editionId, settings) {
  const all = load(KEYS.settings).filter(s => s.editionId !== editionId)
  save(KEYS.settings, [...all, { editionId, ...settings, updatedAt: new Date().toISOString() }])
}

// ── Utilitaire: édition active par année ──────────────────────────────────────

export function getEditionByYear(year) {
  return load(KEYS.editions).find(e => e.year === year) ?? null
}

export function getActiveEdition() {
  const all = load(KEYS.editions)
  return (
    all.find(e => e.status === 'active') ??
    all.sort((a, b) => b.year - a.year)[0] ??
    null
  )
}
