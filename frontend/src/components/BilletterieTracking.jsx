import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import {
  Upload, RefreshCw, CheckCircle, AlertCircle,
  Users, Euro, Ticket, Edit3, Save,
  Target, ChevronDown, Zap, Check, Undo2, Clock
} from 'lucide-react'
import SectionCard from './ui/SectionCard'
import KpiCard from './ui/KpiCard'
import { fmt } from '../lib/format'
import { getCse, saveCse, undoCse } from '../store/eventStore'
import { useEdition } from '../context/EditionContext'
import { useEventContext } from '../context/EventContext'
import { CHANNEL_TYPES } from '../lib/models'

const API = 'http://localhost:8001'

// ── Sources supportées ────────────────────────────────────────────────────────
const SOURCES = [
  { id: 'auto',       label: 'Détection automatique',  icon: '🔍', hint: 'Recommandé — identifie la plateforme depuis les colonnes' },
  { id: 'weezevent',  label: 'Weezevent',               icon: '🎫', hint: 'Export liste participants → Gestion → Participants → Exporter' },
  { id: 'bizouk',     label: 'Bizouk',                  icon: '🎟️', hint: 'Export commandes depuis le back-office Bizouk' },
  { id: 'eventbrite', label: 'Eventbrite',              icon: '📋', hint: 'Attendee Summary ou Order Report CSV' },
  { id: 'billetweb',  label: 'Billetweb',               icon: '🏷️', hint: 'Export commandes CSV depuis tableau de bord' },
  { id: 'helloasso',  label: 'HelloAsso',               icon: '💙', hint: 'Export participants CSV depuis gestion événement' },
  { id: 'yurplan',    label: 'Yurplan',                 icon: '📊', hint: 'Export CSV des réservations' },
  { id: 'shotgun',    label: 'Shotgun',                  icon: '🔫', hint: 'Orders export CSV' },
  { id: 'stripe',     label: 'Stripe',                  icon: '💳', hint: 'Payments export depuis Dashboard → Reports' },
  { id: 'sumup',      label: 'SumUp',                   icon: '💰', hint: 'Transaction history export CSV' },
  { id: 'generic',    label: 'CSV / Excel générique',   icon: '📁', hint: 'Tout fichier CSV ou Excel structuré' },
]

const SOURCE_COLORS = {
  weezevent:  '#06B6D4', bizouk: '#8B5CF6', eventbrite: '#F97316',
  billetweb:  '#10B981', helloasso: '#3B82F6', yurplan: '#EC4899',
  shotgun:    '#EF4444', stripe: '#6366F1', sumup: '#F59E0B',
  generic:    '#8B9BB4', auto: '#068EEA',
}

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2.5 text-xs" style={{ background: '#111D33', border: '1px solid #1A2840' }}>
      <p className="font-semibold text-[#8B9BB4] uppercase tracking-wider mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="num font-semibold" style={{ color: p.color || '#F0F4FF' }}>
          {p.name}: {fmt.number(p.value)}
        </p>
      ))}
    </div>
  )
}

// ── Sélecteur de source ───────────────────────────────────────────────────────
function SourceSelector({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const current = SOURCES.find(s => s.id === value) ?? SOURCES[0]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium w-full transition-all"
        style={{
          background: open ? '#111D33' : 'rgba(255,255,255,0.02)',
          border: `1px solid ${open ? SOURCE_COLORS[value] || '#1A2840' : '#1A2840'}`,
          color: '#F0F4FF',
        }}
      >
        <span className="text-base leading-none">{current.icon}</span>
        <span className="flex-1 text-left">{current.label}</span>
        <ChevronDown size={13} strokeWidth={2}
          className={`opacity-50 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 w-full rounded-xl py-1 z-50"
          style={{ background: '#0D1526', border: '1px solid #1A2840', boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}
        >
          {SOURCES.map(s => (
            <button
              key={s.id}
              onClick={() => { onChange(s.id); setOpen(false) }}
              className="w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#111D33]"
            >
              <span className="text-base mt-0.5 flex-shrink-0">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{s.label}</span>
                  {s.id === value && <Check size={12} className="text-[#10B981]" strokeWidth={2.5} />}
                </div>
                <p className="text-xs mt-0.5 leading-snug" style={{ color: '#4A5568' }}>{s.hint}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Bloc CSE avec persistance + undo ─────────────────────────────────────────
function CseBlock({ editionId }) {
  const stored          = getCse(editionId)
  const [cse, setCseState]  = useState(stored.current)
  const [history, setHistory] = useState(stored.history ?? [])
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(cse)
  const [saved, setSaved]     = useState(false)

  // Recharger si l'édition change
  useEffect(() => {
    const s = getCse(editionId)
    setCseState(s.current)
    setHistory(s.history ?? [])
    setEditing(false)
  }, [editionId])

  function handleSave() {
    saveCse(editionId, draft)
    const s = getCse(editionId)
    setCseState(s.current)
    setHistory(s.history ?? [])
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleUndo() {
    const previous = undoCse(editionId)
    if (previous) {
      const s = getCse(editionId)
      setCseState(s.current)
      setHistory(s.history ?? [])
    }
  }

  const delta      = cse.vendus - cse.objectif
  const deltaPos   = delta >= 0
  const pctAtteint = cse.objectif > 0 ? ((cse.vendus / cse.objectif) * 100).toFixed(1) : 0

  return (
    <SectionCard
      title="CSE — Comités d'entreprise"
      subtitle={
        cse._savedAt
          ? `Dernière mise à jour : ${new Date(cse._savedAt).toLocaleString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}`
          : "Saisie manuelle — persistée par édition"
      }
      action={
        <div className="flex items-center gap-2">
          {history.length > 0 && !editing && (
            <button onClick={handleUndo}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:bg-[#111D33]"
              style={{ border: '1px solid #1A2840', color: '#8B9BB4' }}
              title={`Annuler — ${history.length} état${history.length > 1 ? 's' : ''} sauvegardé${history.length > 1 ? 's' : ''}`}
            >
              <Undo2 size={12} strokeWidth={1.8} />
              <span className="num">{history.length}</span>
            </button>
          )}
          {saved && (
            <span className="flex items-center gap-1 text-xs text-[#10B981]">
              <CheckCircle size={12} strokeWidth={2} /> Enregistré
            </span>
          )}
          {editing ? (
            <button onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-white"
              style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <Save size={12} strokeWidth={2} />Enregistrer
            </button>
          ) : (
            <button onClick={() => { setDraft({ ...cse }); setEditing(true) }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-[#8B9BB4] hover:text-white hover:bg-[#111D33] transition-all"
              style={{ border: '1px solid #1A2840' }}>
              <Edit3 size={12} strokeWidth={1.8} />Modifier
            </button>
          )}
        </div>
      }
    >
      {editing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'vendus',   label: 'Places vendues',  hint: 'Billets CSE confirmés', type: 'number' },
              { key: 'montant',  label: 'Montant (€)',      hint: 'CA total CSE',           type: 'number' },
              { key: 'objectif', label: 'Objectif places',  hint: 'Cible fixée',            type: 'number' },
              { key: 'note',     label: 'Note',             hint: 'Commentaire libre',      type: 'text'   },
            ].map(({ key, label, hint, type }) => (
              <div key={key}>
                <p className="text-2xs font-semibold text-[#8B9BB4] uppercase tracking-wider mb-1">{label}</p>
                <input
                  type={type}
                  value={draft[key] ?? ''}
                  onChange={e => setDraft(d => ({ ...d, [key]: type === 'text' ? e.target.value : Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl text-sm text-white num"
                  style={{ background: '#111D33', border: '1px solid #1A2840', outline: 'none' }}
                  placeholder={hint}
                />
              </div>
            ))}
          </div>
          <button onClick={() => setEditing(false)}
            className="text-2xs text-[#4A5568] hover:text-[#8B9BB4] underline">
            Annuler les modifications
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Places vendues', value: fmt.number(cse.vendus),    color: '#068EEA' },
              { label: 'CA total',       value: fmt.currency(cse.montant), color: '#F59E0B' },
              { label: 'Objectif',       value: fmt.number(cse.objectif),  color: '#4A5568' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1A2840' }}>
                <p className="text-2xs text-[#4A5568] mb-1">{label}</p>
                <p className="num text-lg font-bold" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>
          <div>
            <div className="flex justify-between mb-1.5">
              <p className="text-xs text-[#8B9BB4]">Progression vs objectif</p>
              <span className="num text-xs font-bold" style={{ color: deltaPos ? '#10B981' : '#EF4444' }}>
                {deltaPos ? '+' : ''}{fmt.number(delta)} ({pctAtteint}%)
              </span>
            </div>
            <div className="h-3 rounded-full" style={{ background: '#1A2840' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, pctAtteint)}%`, background: deltaPos ? '#10B981' : '#068EEA' }} />
            </div>
          </div>
          {cse.note && (
            <div className="p-2 rounded-lg" style={{ background: 'rgba(6,142,234,0.07)', border: '1px solid rgba(6,142,234,0.15)' }}>
              <p className="text-xs text-[#8B9BB4]"><span className="text-[#21AAFA] font-semibold">Note : </span>{cse.note}</p>
            </div>
          )}
          {/* Historique condensé */}
          {history.length > 0 && (
            <div className="pt-2 border-t" style={{ borderColor: '#1A2840' }}>
              <p className="text-2xs font-semibold text-[#4A5568] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Clock size={10} strokeWidth={2} /> Historique ({history.length} entrée{history.length > 1 ? 's' : ''})
              </p>
              <div className="space-y-1">
                {history.slice(0, 3).map((h, i) => (
                  <div key={i} className="flex items-center justify-between text-xs"
                    style={{ color: '#4A5568' }}>
                    <span className="num">{fmt.number(h.vendus)} billets · {fmt.currency(h.montant)}</span>
                    <span>{h._savedAt ? new Date(h._savedAt).toLocaleDateString('fr-FR') : '—'}</span>
                  </div>
                ))}
                {history.length > 3 && (
                  <p className="text-2xs" style={{ color: '#4A5568' }}>+ {history.length - 3} entrée{history.length - 3 > 1 ? 's' : ''} plus ancienne{history.length - 3 > 1 ? 's' : ''}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  )
}

// ── Historique des imports ────────────────────────────────────────────────────
function ImportHistory({ editionId, onRollback }) {
  const [imports, setImports] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!editionId) return
    fetch(`${API}/api/imports/${editionId}`)
      .then(r => r.ok ? r.json() : [])
      .then(setImports)
      .catch(() => {})
  }, [editionId])

  if (!imports.length) return null

  const DEDUP_LABELS = {
    first:       { label: '1er import', color: '#10B981' },
    incremental: { label: 'Incrémental', color: '#068EEA' },
    cumulative:  { label: 'Cumulatif (dédup)', color: '#F59E0B' },
  }

  async function handleRollback(importId) {
    if (!confirm('Annuler cet import ? L\'état sera recalculé.')) return
    setLoading(true)
    try {
      await fetch(`${API}/api/imports/${importId}/rollback?edition_id=${editionId}`, { method: 'DELETE' })
      onRollback?.()
      const fresh = await fetch(`${API}/api/imports/${editionId}`).then(r => r.json())
      setImports(fresh)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SectionCard title="Historique des imports" subtitle={`${imports.length} import${imports.length > 1 ? 's' : ''} enregistré${imports.length > 1 ? 's' : ''}`}>
      <div className="space-y-2">
        {imports.map((imp, i) => {
          const dedup = DEDUP_LABELS[imp.dedup_mode] ?? DEDUP_LABELS.first
          return (
            <div key={imp.id} className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1A2840' }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: dedup.color }} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{imp.filename}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-2xs px-1.5 py-0.5 rounded font-medium"
                      style={{ background: `${dedup.color}18`, color: dedup.color }}>
                      {dedup.label}
                    </span>
                    <span className="text-2xs" style={{ color: '#4A5568' }}>
                      {imp.new_rows} cmd · {new Date(imp.imported_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                <span className="num text-xs font-bold" style={{ color: '#F59E0B' }}>
                  {imp.ca_total ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', notation: 'compact' }).format(imp.ca_total) : '—'}
                </span>
                {i === 0 && (
                  <button onClick={() => handleRollback(imp.id)} disabled={loading}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition hover:bg-[#111D33]"
                    style={{ border: '1px solid #1A2840', color: '#8B9BB4' }}
                    title="Annuler cet import">
                    <Undo2 size={11} strokeWidth={1.8} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function BilletterieTracking() {
  const { activeEdition } = useEdition()
  const editionId = activeEdition?.id ?? null

  const { channels } = useEventContext()
  const [channelId,    setChannelId]    = useState(null)

  const [source,      setSource]      = useState('auto')
  const [file,        setFile]        = useState(null)
  const [status,      setStatus]      = useState('idle')
  const [data,        setData]        = useState(null)
  const [savedState,  setSavedState]  = useState(null)  // état agrégé depuis DB
  const [dragging,    setDragging]    = useState(false)
  const [histKey,     setHistKey]     = useState(0)     // force reload historique

  // Charger l'état agrégé depuis la DB au montage + changement d'édition
  useEffect(() => {
    if (!editionId) return
    fetch(`${API}/api/imports/${editionId}/state`)
      .then(r => r.ok ? r.json() : null)
      .then(s => { if (s?.nb_commandes > 0) setSavedState(s) })
      .catch(() => {})
  }, [editionId, histKey])

  // Totaux : import courant OU état sauvegardé OU 0
  const activeData = data ?? savedState
  const cseStored  = getCse(editionId)
  const cse        = cseStored.current

  const totalParticipants = (activeData?.nb_participants ?? 0) + (cse.vendus ?? 0)
  const totalCA           = (activeData?.ca_total ?? 0) + (cse.montant ?? 0)
  const objectifTotal     = 15000
  const pctObjectif       = objectifTotal > 0 ? ((totalParticipants / objectifTotal) * 100).toFixed(1) : 0

  const detectedSource = (data ?? savedState)?.source_detected
  const sourceColor    = SOURCE_COLORS[detectedSource] ?? '#8B9BB4'

  async function handleFile(f) {
    setFile(f)
    setStatus('loading')
    const form = new FormData()
    form.append('file', f)
    try {
      const params = new URLSearchParams({ source, save: 'true' })
      if (editionId) params.set('edition_id', editionId)
      if (channelId) params.set('channel_id', channelId)
      const url = `${API}/api/upload/import?${params}`
      const res = await fetch(url, { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || res.status)
      }
      const result = await res.json()
      setData(result)
      setStatus('success')
      // Rafraîchir l'état sauvegardé + historique si sauvegardé en DB
      if (result._saved) {
        setSavedState(result._state ?? null)
        setHistKey(k => k + 1)
      }
    } catch (e) {
      console.error('Import error:', e)
      setStatus('error')
    }
  }

  function reset() { setFile(null); setStatus('idle'); setData(null) }

  function onDrop(e) {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer?.files?.[0]
    if (f) handleFile(f)
  }

  const borderColor = dragging
    ? '#06B6D4'
    : status === 'success' ? '#10B981'
    : status === 'error'   ? '#EF4444'
    : '#1A2840'

  return (
    <div className="space-y-5">

      {/* Sélecteur source */}
      <SectionCard
        title="Source de données"
        subtitle="Sélectionner la plateforme de billetterie"
      >
        <SourceSelector value={source} onChange={v => { setSource(v); reset() }} />
        {source !== 'auto' && (
          <p className="text-xs mt-2" style={{ color: '#4A5568' }}>
            {SOURCES.find(s => s.id === source)?.hint}
          </p>
        )}
      </SectionCard>

      {/* Canal de distribution */}
      {channels.length > 0 && (
        <SectionCard title="Canal de distribution" subtitle="Associer cet import à un canal">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setChannelId(null)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition"
              style={{
                background: channelId === null ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.02)',
                border:     `1px solid ${channelId === null ? '#6366F1' : '#1A2840'}`,
                color:      channelId === null ? '#A5B4FC' : '#8B9BB4',
              }}>
              Tous canaux
            </button>
            {channels.map(ch => {
              const type = CHANNEL_TYPES.find(t => t.id === ch.type)
              return (
                <button
                  key={ch.id}
                  onClick={() => setChannelId(id => id === ch.id ? null : ch.id)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition"
                  style={{
                    background: channelId === ch.id ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.02)',
                    border:     `1px solid ${channelId === ch.id ? '#6366F1' : '#1A2840'}`,
                    color:      channelId === ch.id ? '#A5B4FC' : '#8B9BB4',
                  }}>
                  <span className="text-sm leading-none">{type?.icon}</span>
                  {ch.name}
                </button>
              )
            })}
          </div>
          {channelId && (
            <p className="text-xs mt-2" style={{ color: '#4A5568' }}>
              Import associé au canal sélectionné — visible dans l'historique par canal.
            </p>
          )}
        </SectionCard>
      )}

      {/* Zone d'upload */}
      <SectionCard
        title="Import fichier"
        subtitle={`Accepté : .xlsx, .xls, .csv${source !== 'auto' ? ` — format ${SOURCES.find(s=>s.id===source)?.label}` : ''}`}
      >
        <div
          className="rounded-xl p-5 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200"
          style={{
            background: dragging ? 'rgba(6,182,212,0.08)' : 'rgba(255,255,255,0.02)',
            border: `2px dashed ${borderColor}`,
          }}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => document.getElementById('import-input')?.click()}
        >
          <input id="import-input" type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

          <div className="flex items-center gap-3">
            {status === 'loading'  && <RefreshCw size={18} className="animate-spin text-[#06B6D4]" strokeWidth={2} />}
            {status === 'success'  && <CheckCircle size={18} className="text-[#10B981]" strokeWidth={2} />}
            {status === 'error'    && <AlertCircle size={18} className="text-[#EF4444]" strokeWidth={2} />}
            {status === 'idle'     && <Upload size={18} className="text-[#06B6D4]" strokeWidth={1.8} />}
            <div>
              {status === 'idle'    && <p className="text-sm font-medium text-white">Déposer le fichier ou cliquer pour parcourir</p>}
              {status === 'loading' && <p className="text-sm font-medium text-[#06B6D4]">Analyse en cours…</p>}
              {status === 'success' && <p className="text-sm font-medium text-[#10B981]">Importé — {file?.name}</p>}
              {status === 'error'   && <p className="text-sm font-medium text-[#EF4444]">Erreur de lecture — vérifier le fichier ou le backend</p>}
            </div>
          </div>
          {status !== 'idle' && (
            <button onClick={e => { e.stopPropagation(); reset() }}
              className="text-2xs text-[#4A5568] hover:text-[#8B9BB4] underline">
              Réinitialiser
            </button>
          )}
        </div>

        {/* Source détectée */}
        {data && status === 'success' && detectedSource && (
          <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg"
            style={{ background: `${sourceColor}0D`, border: `1px solid ${sourceColor}30` }}>
            <Zap size={13} style={{ color: sourceColor }} strokeWidth={2} />
            <p className="text-xs font-medium" style={{ color: sourceColor }}>
              Source identifiée : <span className="font-bold">{data.source_label ?? detectedSource}</span>
            </p>
            {data.meta?.col_map && Object.keys(data.meta.col_map).length === 0 && (
              <span className="ml-auto text-xs text-[#EF4444]">⚠ Colonnes non reconnues — essayer une autre source</span>
            )}
          </div>
        )}

        {/* Erreur backend inactif */}
        {status === 'error' && (
          <div className="mt-3 p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <p className="text-xs text-[#8B9BB4]">
              <span className="text-[#F59E0B] font-semibold">Backend inactif ou format non reconnu.</span>{' '}
              Lancer <code className="px-1 py-0.5 rounded text-2xs" style={{ background: '#111D33', color: '#06B6D4' }}>start.bat</code>{' '}
              ou vérifier le format du fichier. Si le problème persiste, forcer la source manuellement ci-dessus.
            </p>
          </div>
        )}
      </SectionCard>

      {/* Résumé déduplication */}
      {data?._dedup && (
        <div className="p-3 rounded-xl flex items-start gap-3 animate-slide-up"
          style={{
            background: ['partial','duplicate'].includes(data._dedup.mode) ? 'rgba(245,158,11,0.07)' : 'rgba(16,185,129,0.07)',
            border: `1px solid ${['partial','duplicate'].includes(data._dedup.mode) ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`,
          }}>
          <div style={{ color: ['partial','duplicate'].includes(data._dedup.mode) ? '#F59E0B' : '#10B981', fontSize: '1rem' }}>
            {['partial','duplicate'].includes(data._dedup.mode) ? '⚠' : '✓'}
          </div>
          <div>
            {(() => {
              const { mode, new_rows, duplicate_rows, id_based } = data._dedup
              const msgs = {
                first:       { color: '#10B981', text: `Premier import — ${new_rows} commandes ajoutées` },
                incremental: { color: '#10B981', text: `Import incrémental — ${new_rows} nouvelles commandes ajoutées` },
                partial:     { color: '#F59E0B', text: `Fichier cumulatif — ${new_rows} nouvelles commandes ajoutées, ${duplicate_rows} doublons ignorés` },
                duplicate:   { color: '#8B9BB4', text: `Fichier déjà importé — ${duplicate_rows} commandes déjà en base, aucune donnée dupliquée` },
              }
              const m = msgs[mode] ?? msgs.incremental
              return (
                <>
                  <p className="text-xs font-semibold" style={{ color: m.color }}>{m.text}</p>
                  {id_based && (
                    <p className="text-xs mt-0.5" style={{ color: '#4A5568' }}>
                      Déduplication exacte par ID de commande
                    </p>
                  )}
                  {!id_based && (
                    <p className="text-xs mt-0.5" style={{ color: '#4A5568' }}>
                      Aucun ID trouvé dans le fichier — déduplication non disponible pour ce format
                    </p>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Vue consolidée */}
      {(activeData || cse.vendus > 0) && (
        <div className="p-4 rounded-2xl animate-slide-up"
          style={{ background: 'rgba(6,142,234,0.06)', border: '1px solid rgba(6,142,234,0.2)' }}>
          <p className="text-xs font-semibold text-[#21AAFA] uppercase tracking-wider mb-3">
            Vue consolidée {savedState ? '(données sauvegardées)' : 'import + CSE'}
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-2xs text-[#8B9BB4]">Total billets émis</p>
              <p className="num text-2xl font-bold text-white mt-0.5">{fmt.number(totalParticipants)}</p>
              <p className="text-2xs text-[#4A5568] mt-0.5">
                Import {fmt.number(activeData?.nb_participants ?? 0)} + CSE {fmt.number(cse.vendus)}
              </p>
            </div>
            <div>
              <p className="text-2xs text-[#8B9BB4]">CA total estimé</p>
              <p className="num text-2xl font-bold text-[#F59E0B] mt-0.5">{fmt.currency(totalCA)}</p>
              <p className="text-2xs text-[#4A5568] mt-0.5">Import + CSE cumulés</p>
            </div>
            <div>
              <p className="text-2xs text-[#8B9BB4]">Progression objectif {fmt.number(objectifTotal)}</p>
              <p className="num text-2xl font-bold text-[#10B981] mt-0.5">{pctObjectif}%</p>
              <div className="mt-1 h-2 rounded-full" style={{ background: '#1A2840' }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, pctObjectif)}%`, background: '#10B981' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Résultats KPIs */}
      {data && status === 'success' && (
        <SectionCard
          title={`Résultats — ${data.source_label ?? detectedSource ?? 'Import'}`}
          subtitle={`${fmt.number(data.meta?.rows ?? 0)} lignes analysées`}
        >
          <div className="space-y-4 animate-slide-up">
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <KpiCard label="Commandes"    value={fmt.number(data.nb_commandes)}    sub="Uniques"             delta={null} accent="teal"   icon={Ticket} />
              <KpiCard label="Participants" value={fmt.number(data.nb_participants)} sub="Billets émis"        delta={null} accent="blue"   icon={Users}  />
              <KpiCard label="CA"           value={data.ca_total ? fmt.currency(data.ca_total) : '—'} sub="Montant total" delta={null} accent="gold"   icon={Euro}   />
              <KpiCard label="Formules"     value={fmt.number(data.nb_tarifs)}       sub="Tarifs distincts"    delta={null} accent="violet" icon={Target} />
            </div>

            {/* Rythme de vente */}
            {data.ventes_par_mois?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#8B9BB4] uppercase tracking-wider mb-3">Rythme de vente</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={data.ventes_par_mois} barSize={18} barCategoryGap="25%">
                    <CartesianGrid vertical={false} stroke="#1A2840" strokeDasharray="3 3" />
                    <XAxis dataKey="mois" tick={{ fill: '#8B9BB4', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#8B9BB4', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip content={<Tip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="nb" name="Commandes" radius={[4,4,0,0]}>
                      {data.ventes_par_mois.map((d, i) => (
                        <Cell key={i}
                          fill={d.nb === Math.max(...data.ventes_par_mois.map(x=>x.nb)) ? '#F59E0B' : sourceColor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Répartition tarifs */}
            {data.top_tarifs?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#8B9BB4] uppercase tracking-wider mb-3">Répartition par formule</p>
                <div className="space-y-2">
                  {data.top_tarifs.map(({ tarif, nb, pct }) => (
                    <div key={tarif}>
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs text-[#8B9BB4] truncate pr-2">{tarif}</p>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <p className="num text-xs font-semibold text-white">{fmt.number(nb)}</p>
                          <p className="num text-2xs text-[#4A5568] w-8 text-right">{pct?.toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: '#1A2840' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: sourceColor }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Canaux */}
            {data.canaux && Object.keys(data.canaux).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#8B9BB4] uppercase tracking-wider mb-2">Canaux de vente</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(data.canaux).map(([canal, nb]) => (
                    <span key={canal} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                      style={{ background: '#111D33', border: '1px solid #1A2840', color: '#8B9BB4' }}>
                      <span className="num font-bold text-white">{fmt.number(nb)}</span>
                      {canal}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Debug colonnes si détection échoue */}
            {data.nb_commandes === 0 && data.nb_participants === 0 && (
              <div className="p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <p className="text-xs font-semibold text-[#F59E0B] mb-1">Colonnes non reconnues</p>
                <p className="text-xs text-[#8B9BB4] mb-2">Colonnes détectées dans le fichier :</p>
                <div className="flex flex-wrap gap-1">
                  {(data.meta?.columns ?? []).map(c => (
                    <code key={c} className="px-2 py-0.5 rounded text-2xs"
                      style={{ background: '#111D33', color: '#06B6D4' }}>{c}</code>
                  ))}
                </div>
                <p className="text-xs text-[#8B9BB4] mt-2">
                  Conseil : forcer la source manuellement en haut de cette page.
                </p>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* Historique des imports */}
      <ImportHistory editionId={editionId} onRollback={() => { setHistKey(k => k + 1); setData(null) }} />

      {/* CSE — persisté par édition */}
      <CseBlock editionId={editionId} />
    </div>
  )
}
