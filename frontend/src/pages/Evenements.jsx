import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Calendar, ChevronRight, Archive,
  CheckCircle2, Clock, Zap, BarChart2, Settings2
} from 'lucide-react'
import { useEventContext } from '../context/EventContext'
import { createEvent, createEdition, EVENT_TYPES, RECOMMENDED_MODULES, EDITION_STATUS } from '../lib/models'
import ChannelManager from '../components/ChannelManager'

const C = {
  bg:      '#05080F',
  surface: '#0D1526',
  border:  '#1A2840',
  accent:  '#6366F1',
  gold:    '#F59E0B',
  green:   '#10B981',
  text:    '#F0F4FF',
  muted:   '#8B9BB4',
}

function StatusBadge({ status }) {
  const s = EDITION_STATUS[status] ?? EDITION_STATUS.upcoming
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: `${s.color}18`, color: s.color, border: `1px solid ${s.color}35` }}
    >
      {status === 'active' && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: s.color }} />}
      {s.label}
    </span>
  )
}

function EventTypeIcon({ type }) {
  const t = EVENT_TYPES.find(e => e.id === type)
  return <span className="text-xl">{t?.icon ?? '📋'}</span>
}

// ── Modal création édition ────────────────────────────────────────────────────
function NewEditionModal({ eventId, onSave, onClose }) {
  const [form, setForm] = useState({
    name: '', year: new Date().getFullYear() + 1,
    dateStart: '', dateEnd: '', jaugeEst: '', caEst: '',
  })
  const set = k => v => setForm(f => ({ ...f, [k]: v }))

  function handleSave() {
    if (!form.name.trim()) return
    onSave(createEdition({
      eventId,
      name:      form.name.trim(),
      year:      Number(form.year),
      dateStart: form.dateStart || null,
      dateEnd:   form.dateEnd   || null,
      jaugeEst:  form.jaugeEst  ? Number(form.jaugeEst)  : null,
      caEst:     form.caEst     ? Number(form.caEst)     : null,
      status:    'upcoming',
    }))
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(5,8,15,0.8)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl p-6" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
        <h3 className="text-lg font-bold text-white mb-4">Nouvelle édition</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#8B9BB4] uppercase tracking-wider mb-1">Nom de l'édition *</label>
            <input
              className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none transition"
              style={{ background: '#080E1E', border: `1px solid ${C.border}` }}
              placeholder="Ex: Festival Client 2026"
              value={form.name}
              onChange={e => set('name')(e.target.value)}
              onFocus={e => e.target.style.borderColor = C.accent}
              onBlur={e  => e.target.style.borderColor = C.border}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#8B9BB4] uppercase tracking-wider mb-1">Année</label>
              <input type="number" className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                style={{ background: '#080E1E', border: `1px solid ${C.border}` }}
                value={form.year} onChange={e => set('year')(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8B9BB4] uppercase tracking-wider mb-1">Jauge estimée</label>
              <input type="number" className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                style={{ background: '#080E1E', border: `1px solid ${C.border}` }}
                placeholder="Ex: 20000"
                value={form.jaugeEst} onChange={e => set('jaugeEst')(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#8B9BB4] uppercase tracking-wider mb-1">Date début</label>
              <input type="date" className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                style={{ background: '#080E1E', border: `1px solid ${C.border}`, colorScheme: 'dark' }}
                value={form.dateStart} onChange={e => set('dateStart')(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8B9BB4] uppercase tracking-wider mb-1">Date fin</label>
              <input type="date" className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                style={{ background: '#080E1E', border: `1px solid ${C.border}`, colorScheme: 'dark' }}
                value={form.dateEnd} onChange={e => set('dateEnd')(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#8B9BB4] uppercase tracking-wider mb-1">CA estimé (€)</label>
            <input type="number" className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
              style={{ background: '#080E1E', border: `1px solid ${C.border}` }}
              placeholder="Ex: 600000"
              value={form.caEst} onChange={e => set('caEst')(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition"
            style={{ border: `1px solid ${C.border}`, color: C.muted }}>
            Annuler
          </button>
          <button onClick={handleSave}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition"
            style={{ background: C.accent }}>
            Créer l'édition
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal création événement ───────────────────────────────────────────────────
function NewEventModal({ onSave, onClose }) {
  const [form, setForm] = useState({ name: '', type: 'festival', description: '' })
  const set = k => v => setForm(f => ({ ...f, [k]: v }))

  function handleSave() {
    if (!form.name.trim()) return
    onSave(createEvent({
      name:        form.name.trim(),
      type:        form.type,
      description: form.description,
      modules:     RECOMMENDED_MODULES[form.type] ?? [],
    }))
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(5,8,15,0.8)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl p-6" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
        <h3 className="text-lg font-bold text-white mb-4">Nouvel événement</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#8B9BB4] uppercase tracking-wider mb-1">Nom de l'événement *</label>
            <input
              className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
              style={{ background: '#080E1E', border: `1px solid ${C.border}` }}
              placeholder="Ex: Festival Été, Afterwork Business Club..."
              value={form.name}
              onChange={e => set('name')(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#8B9BB4] uppercase tracking-wider mb-1">Type d'événement</label>
            <div className="grid grid-cols-3 gap-2">
              {EVENT_TYPES.map(t => (
                <button key={t.id}
                  onClick={() => set('type')(t.id)}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-medium transition"
                  style={{
                    background: form.type === t.id ? `${C.accent}20` : '#080E1E',
                    border: `1px solid ${form.type === t.id ? C.accent : C.border}`,
                    color: form.type === t.id ? '#A5B4FC' : C.muted,
                  }}
                >
                  <span className="text-base">{t.icon}</span>
                  <span className="leading-tight text-center">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#8B9BB4] uppercase tracking-wider mb-1">Description</label>
            <textarea
              className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none resize-none"
              style={{ background: '#080E1E', border: `1px solid ${C.border}` }}
              rows={2}
              placeholder="Description courte..."
              value={form.description}
              onChange={e => set('description')(e.target.value)}
            />
          </div>
          <div className="px-3 py-2 rounded-lg" style={{ background: 'rgba(99,102,241,0.08)', border: `1px solid rgba(99,102,241,0.2)` }}>
            <p className="text-xs font-semibold text-[#818CF8] mb-1">Modules recommandés</p>
            <p className="text-xs text-[#8B9BB4]">
              {(RECOMMENDED_MODULES[form.type] ?? []).join(' · ')}
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-semibold"
            style={{ border: `1px solid ${C.border}`, color: C.muted }}>
            Annuler
          </button>
          <button onClick={handleSave}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: C.accent }}>
            Créer l'événement
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────────────────────
export default function Evenements() {
  const navigate = useNavigate()
  const {
    events, editions, activeEvent, activeEdition,
    setActiveEventId, setActiveEditionId,
    addEvent, addEdition, refresh,
  } = useEventContext()

  const [showNewEvent,   setShowNewEvent]   = useState(false)
  const [newEditionFor,  setNewEditionFor]  = useState(null)
  // Sélecteurs indépendants pour le panneau de configuration
  const [cfgEventId,   setCfgEventId]   = useState(null)
  const [cfgEditionId, setCfgEditionId] = useState(null)

  const cfgEvent   = events.find(e => e.id === (cfgEventId   ?? activeEvent?.id))   ?? activeEvent
  const cfgEdition = editions.find(e => e.id === (cfgEditionId ?? activeEdition?.id)) ?? activeEdition
  const cfgEditions = editions.filter(e => e.eventId === cfgEvent?.id).sort((a,b) => b.year - a.year)

  const visibleEvents = events.filter(e => !e.archived)

  function selectEdition(edition) {
    setActiveEventId(edition.eventId)
    setActiveEditionId(edition.id)
    navigate('/')
  }

  function handleAddEvent(data) {
    addEvent(data)
    refresh()
  }

  function handleAddEdition(data) {
    addEdition(data)
    refresh()
  }

  return (
    <div className="p-6 space-y-6" style={{ color: C.text }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Mes événements</h2>
          <p className="text-sm mt-0.5" style={{ color: C.muted }}>
            {visibleEvents.length} événement{visibleEvents.length > 1 ? 's' : ''} ·{' '}
            {editions.length} édition{editions.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowNewEvent(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
          style={{ background: C.accent }}
        >
          <Plus size={16} strokeWidth={2.5} />
          Nouvel événement
        </button>
      </div>

      {/* Liste événements */}
      {visibleEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center"
          style={{ border: `1px dashed ${C.border}`, borderRadius: 16 }}>
          <BarChart2 size={40} className="mb-4 opacity-30" />
          <p className="text-base font-semibold text-white mb-1">Aucun événement</p>
          <p className="text-sm mb-4" style={{ color: C.muted }}>Créez votre premier événement pour commencer.</p>
          <button onClick={() => setShowNewEvent(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: C.accent }}>
            <Plus size={15} /> Créer un événement
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleEvents.map(event => {
            const evEditions = editions
              .filter(e => e.eventId === event.id)
              .sort((a, b) => b.year - a.year)
            const isActive = activeEvent?.id === event.id
            const eventType = EVENT_TYPES.find(t => t.id === event.type)

            return (
              <div key={event.id}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: C.surface,
                  border: `1px solid ${isActive ? C.accent + '60' : C.border}`,
                }}
              >
                {/* Event header */}
                <div className="flex items-center justify-between px-5 py-4"
                  style={{ borderBottom: `1px solid ${C.border}` }}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{eventType?.icon ?? '📋'}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">{event.name}</h3>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                            style={{ background: `${C.accent}20`, color: '#A5B4FC', border: `1px solid ${C.accent}40` }}>
                            Actif
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                        {eventType?.label} · {evEditions.length} édition{evEditions.length > 1 ? 's' : ''}
                        {event.description && ` · ${event.description}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setNewEditionFor(event.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition hover:opacity-80"
                      style={{ border: `1px solid ${C.border}`, color: C.muted }}
                    >
                      <Plus size={13} /> Édition
                    </button>
                  </div>
                </div>

                {/* Éditions */}
                {evEditions.length === 0 ? (
                  <div className="px-5 py-4 text-sm" style={{ color: C.muted }}>
                    Aucune édition — <button className="underline" onClick={() => setNewEditionFor(event.id)}>créer la première</button>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: C.border }}>
                    {evEditions.map(edition => {
                      const statusInfo = EDITION_STATUS[edition.status] ?? EDITION_STATUS.upcoming
                      return (
                        <button
                          key={edition.id}
                          onClick={() => selectEdition(edition)}
                          className="w-full flex items-center justify-between px-5 py-3 transition hover:bg-[#111D33] text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg"
                              style={{ background: '#080E1E', border: `1px solid ${C.border}` }}>
                              <Calendar size={14} style={{ color: C.muted }} strokeWidth={1.8} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">{edition.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <StatusBadge status={edition.status} />
                                {edition.jaugeEst && (
                                  <span className="text-xs" style={{ color: C.muted }}>
                                    ~{edition.jaugeEst.toLocaleString('fr-FR')} participants
                                  </span>
                                )}
                                {edition.caEst && (
                                  <span className="text-xs" style={{ color: C.muted }}>
                                    · {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', notation: 'compact' }).format(edition.caEst)} estimé
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex gap-1">
                              {(edition.modules ?? []).slice(0, 4).map(m => (
                                <span key={m} className="px-1.5 py-0.5 rounded text-xs font-medium"
                                  style={{ background: '#080E1E', color: C.muted, border: `1px solid ${C.border}` }}>
                                  {m}
                                </span>
                              ))}
                              {(edition.modules ?? []).length > 4 && (
                                <span className="px-1.5 py-0.5 rounded text-xs" style={{ color: C.muted }}>
                                  +{edition.modules.length - 4}
                                </span>
                              )}
                            </div>
                            <ChevronRight size={14} style={{ color: C.muted }} />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Panneau de configuration — avec sélecteurs événement + édition */}
      {visibleEvents.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.border}` }}>

          {/* Header + sélecteurs */}
          <div className="px-5 py-4 space-y-3" style={{ borderBottom: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-2">
              <Settings2 size={14} style={{ color: '#6366F1' }} strokeWidth={1.8} />
              <p className="text-sm font-semibold text-white">Configuration</p>
            </div>
            {/* Sélecteur événement */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#4A5568', fontSize: '0.6rem' }}>
                  Événement
                </p>
                <select
                  className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ background: '#111D33', border: '1px solid #1A2840', colorScheme: 'dark' }}
                  value={cfgEvent?.id ?? ''}
                  onChange={e => {
                    setCfgEventId(e.target.value)
                    setCfgEditionId(null) // reset édition quand on change d'événement
                  }}>
                  {visibleEvents.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
              </div>
              {/* Sélecteur édition */}
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#4A5568', fontSize: '0.6rem' }}>
                  Édition
                </p>
                <select
                  className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ background: '#111D33', border: '1px solid #1A2840', colorScheme: 'dark' }}
                  value={cfgEdition?.id ?? ''}
                  onChange={e => {
                    const ed = editions.find(x => x.id === e.target.value)
                    if (ed) {
                      setCfgEditionId(ed.id)
                      // Mettre à jour l'édition active dans le contexte
                      setActiveEditionId(ed.id)
                      setActiveEventId(ed.eventId)
                    }
                  }}>
                  {cfgEditions.map(ed => (
                    <option key={ed.id} value={ed.id}>{ed.name}</option>
                  ))}
                  {cfgEditions.length === 0 && (
                    <option value="">Aucune édition</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Contenu — uniquement canaux */}
          <div className="p-5">
            {cfgEdition ? (
              <ChannelManager editionId={cfgEdition.id} />
            ) : (
              <p className="text-xs text-center py-4" style={{ color: '#4A5568' }}>
                Sélectionnez une édition pour configurer les canaux.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showNewEvent && (
        <NewEventModal
          onSave={handleAddEvent}
          onClose={() => setShowNewEvent(false)}
        />
      )}
      {newEditionFor && (
        <NewEditionModal
          eventId={newEditionFor}
          onSave={handleAddEdition}
          onClose={() => setNewEditionFor(null)}
        />
      )}
    </div>
  )
}
