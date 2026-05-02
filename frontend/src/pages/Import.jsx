import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Upload, CheckCircle, AlertCircle, FileSpreadsheet,
  Trash2, RefreshCw, Database, Info, Link, AlertTriangle,
  Clock, RotateCcw, ChevronDown, ChevronRight
} from 'lucide-react'
import { fmt } from '../lib/format'
import { useEdition } from '../context/EditionContext'
import { API } from '../lib/api'

// ── Sources d'import ─────────────────────────────────────────────────────────
const SLOTS = [
  {
    id:           'conso',
    label:        'Données de consommation',
    sub:          'Export Weezpay — onglet BDD ou JDD Vente',
    icon:         Database,
    color:        '#068EEA',
    hint:         'export_consommation_20XX.xlsx · export_ventes_20XX.xlsx',
    endpoint:     '/api/upload/import',
    sourceParam:  'conso',
    modules:      ['Consommation', 'Profil Client', 'Invitations', 'Stocks'],
    needsEdition: true,
    formats:      ['.xlsx', '.xls', '.csv', '.parquet'],
  },
  {
    id:           'billetterie',
    label:        'Billetterie multi-source',
    sub:          'Weezevent · Bizouk · BilletWeb · Eventbrite · Shotgun…',
    icon:         FileSpreadsheet,
    color:        '#F59E0B',
    hint:         'export_weezevent.xlsx · export_bizouk.xlsx · …',
    endpoint:     '/api/upload/import',
    sourceParam:  'auto',
    modules:      ['Billetterie', 'Suivi live', 'Vue Globale'],
    needsEdition: true,
    formats:      ['.xlsx', '.xls', '.csv'],
  },
]

// ── Composant slot d'import ───────────────────────────────────────────────────
function FileSlot({ slot, state, onDrop, onRemove, editionId, editionName }) {
  const inputRef  = useRef(null)
  const [drag, setDrag] = useState(false)
  const { icon: Icon, color } = slot
  const status = state?.status ?? 'idle'

  const handleInput = useCallback(e => {
    e.preventDefault()
    setDrag(false)
    const file = e.dataTransfer?.files?.[0] ?? e.target?.files?.[0]
    if (file) onDrop(slot.id, file)
  }, [slot.id, onDrop])

  const noEdition = slot.needsEdition && !editionId

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200"
      style={{
        background: drag ? `${color}10` : '#0D1526',
        border: `1px solid ${drag ? color : status === 'success' ? '#10B981' : status === 'error' ? '#EF4444' : '#1A2840'}`,
      }}
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleInput}
    >
      {/* Header slot */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}18` }}>
            <Icon size={18} style={{ color }} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{slot.label}</p>
            <p className="text-xs text-[#8B9BB4] mt-0.5">{slot.sub}</p>
          </div>
        </div>
        {state?.file && (
          <button onClick={() => onRemove(slot.id)}
            className="p-1.5 rounded-lg text-[#4A5568] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors">
            <Trash2 size={14} strokeWidth={1.8} />
          </button>
        )}
      </div>

      {/* Formats acceptés */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {slot.formats.map(f => (
          <span key={f} className="text-2xs px-2 py-0.5 rounded font-mono"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#4A5568', border: '1px solid #1A2840' }}>
            {f}
          </span>
        ))}
      </div>

      {/* Badge édition */}
      {slot.needsEdition && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
          style={{
            background: editionId ? 'rgba(6,142,234,0.08)' : 'rgba(245,158,11,0.08)',
            border:     `1px solid ${editionId ? 'rgba(6,142,234,0.2)' : 'rgba(245,158,11,0.2)'}`,
          }}>
          {editionId ? (
            <>
              <Link size={11} style={{ color: '#068EEA' }} strokeWidth={2} />
              <span style={{ color: '#8B9BB4' }}>Édition :</span>
              <span className="font-semibold" style={{ color: '#21AAFA' }}>{editionName}</span>
            </>
          ) : (
            <>
              <AlertTriangle size={11} style={{ color: '#F59E0B' }} strokeWidth={2} />
              <span style={{ color: '#F59E0B' }}>Sélectionnez une édition en haut de page</span>
            </>
          )}
        </div>
      )}

      {/* Zone de dépôt */}
      {!state?.file ? (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={noEdition}
          className="flex flex-col items-center justify-center gap-3 py-7 rounded-xl border-2 border-dashed
                     transition-all duration-200 w-full"
          style={{
            borderColor: noEdition ? '#1A2840' : `${color}40`,
            background:  noEdition ? 'transparent' : `${color}05`,
            opacity:     noEdition ? 0.4 : 1,
            cursor:      noEdition ? 'not-allowed' : 'pointer',
          }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `${color}18` }}>
            <Upload size={18} style={{ color }} strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-white">Déposer ou cliquer pour sélectionner</p>
            <p className="text-xs text-[#8B9BB4] mt-0.5">{slot.hint}</p>
          </div>
          <input ref={inputRef} type="file" accept={slot.formats.join(',')} className="hidden" onChange={handleInput} />
        </button>
      ) : (
        <div className="rounded-xl p-3 flex items-center gap-2"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1A2840' }}>
          <FileSpreadsheet size={15} className="text-[#8B9BB4] flex-shrink-0" strokeWidth={1.8} />
          <p className="text-xs text-white font-medium truncate flex-1">{state.file.name}</p>
          <p className="text-2xs text-[#4A5568] flex-shrink-0">{(state.file.size / 1024).toFixed(0)} ko</p>
        </div>
      )}

      {/* État : en cours */}
      {status === 'loading' && (
        <div className="flex items-center gap-2">
          <RefreshCw size={13} className="animate-spin" style={{ color }} strokeWidth={2} />
          <p className="text-xs text-[#8B9BB4]">Analyse en cours…</p>
        </div>
      )}

      {/* État : succès */}
      {status === 'success' && state.result && (
        <div className="rounded-xl p-3 space-y-2.5"
          style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={13} className="text-[#10B981]" strokeWidth={2} />
              <p className="text-xs font-semibold text-[#10B981]">Import réussi</p>
            </div>
            {state.result._saved && (
              <span className="text-2xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'rgba(6,142,234,0.15)', color: '#21AAFA', border: '1px solid rgba(6,142,234,0.25)' }}>
                Sauvegardé · {editionName}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {state.result.meta?.rows != null && (
              <div>
                <p className="text-2xs text-[#4A5568]">Lignes traitées</p>
                <p className="num text-sm font-bold text-white">{fmt.number(state.result.meta.rows)}</p>
              </div>
            )}
            {state.result.nb_commandes != null && (
              <div>
                <p className="text-2xs text-[#4A5568]">Commandes</p>
                <p className="num text-sm font-bold text-white">{fmt.number(state.result.nb_commandes)}</p>
              </div>
            )}
            {state.result.ca_total != null && (
              <div>
                <p className="text-2xs text-[#4A5568]">CA total</p>
                <p className="num text-sm font-bold text-white">{fmt.currency(state.result.ca_total)}</p>
              </div>
            )}
            {state.result.kpi?.ca_ht != null && (
              <div>
                <p className="text-2xs text-[#4A5568]">CA HT</p>
                <p className="num text-sm font-bold text-white">{fmt.currency(state.result.kpi.ca_ht)}</p>
              </div>
            )}
            {state.result.kpi?.n_clients != null && (
              <div>
                <p className="text-2xs text-[#4A5568]">Clients</p>
                <p className="num text-sm font-bold text-white">{fmt.number(state.result.kpi.n_clients)}</p>
              </div>
            )}
            {state.result._dedup?.mode && (
              <div>
                <p className="text-2xs text-[#4A5568]">Mode dédup</p>
                <p className="text-xs font-semibold text-white capitalize">{state.result._dedup.mode}</p>
              </div>
            )}
          </div>
          {state.result.source_detected && (
            <p className="text-2xs" style={{ color: '#4A5568' }}>
              Source détectée : <span className="text-[#8B9BB4] font-medium">{state.result.source_label ?? state.result.source_detected}</span>
            </p>
          )}
        </div>
      )}

      {/* État : erreur */}
      {status === 'error' && (
        <div className="flex items-start gap-2 p-3 rounded-xl"
          style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={13} className="text-[#EF4444] flex-shrink-0 mt-0.5" strokeWidth={2} />
          <p className="text-xs text-[#EF4444] leading-snug">{state.error ?? 'Erreur lors du traitement du fichier'}</p>
        </div>
      )}

      {/* Modules alimentés */}
      <div className="pt-1 border-t border-[#1A2840]">
        <p className="text-2xs text-[#4A5568] mb-1.5">Modules alimentés :</p>
        <div className="flex flex-wrap gap-1.5">
          {slot.modules.map(m => (
            <span key={m} className="text-2xs px-2 py-0.5 rounded-full"
              style={{
                background: status === 'success' ? `${color}15` : 'rgba(74,85,104,0.15)',
                color:      status === 'success' ? color : '#4A5568',
                border:     `1px solid ${status === 'success' ? `${color}30` : 'transparent'}`,
              }}>
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Historique des imports ────────────────────────────────────────────────────
function ImportHistory({ editionId }) {
  const [imports,  setImports]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [open,     setOpen]     = useState(false)
  const [rolling,  setRolling]  = useState(null)

  useEffect(() => {
    if (!editionId || !open) return
    setLoading(true)
    fetch(`${API}/api/imports/${editionId}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setImports(Array.isArray(data) ? data : []))
      .catch(() => setImports([]))
      .finally(() => setLoading(false))
  }, [editionId, open])

  async function handleRollback(importId) {
    if (!window.confirm('Annuler cet import ? Les données seront recalculées sans ce fichier.')) return
    setRolling(importId)
    try {
      await fetch(`${API}/api/imports/${importId}/rollback?edition_id=${editionId}`, { method: 'DELETE' })
      const fresh = await fetch(`${API}/api/imports/${editionId}`).then(r => r.json())
      setImports(Array.isArray(fresh) ? fresh : [])
    } catch { /* ignore */ }
    setRolling(null)
  }

  if (!editionId) return null

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#0D1526', border: '1px solid #1A2840' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 transition hover:bg-[#111D33]"
      >
        <div className="flex items-center gap-3">
          <Clock size={15} style={{ color: '#8B9BB4' }} strokeWidth={1.8} />
          <p className="text-sm font-semibold text-white">Historique des imports</p>
          {imports.length > 0 && (
            <span className="text-2xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'rgba(6,142,234,0.12)', color: '#21AAFA', border: '1px solid rgba(6,142,234,0.2)' }}>
              {imports.length} import{imports.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {open ? <ChevronDown size={14} className="text-[#4A5568]" /> : <ChevronRight size={14} className="text-[#4A5568]" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-2 border-t border-[#1A2840]" style={{ paddingTop: '1rem' }}>
          {loading && (
            <div className="flex items-center gap-2 py-4">
              <RefreshCw size={13} className="animate-spin text-[#4A5568]" />
              <p className="text-xs text-[#4A5568]">Chargement…</p>
            </div>
          )}
          {!loading && imports.length === 0 && (
            <p className="text-xs text-[#4A5568] py-4 text-center">Aucun import pour cette édition.</p>
          )}
          {!loading && imports.map(imp => (
            <div key={imp.id}
              className="flex items-start justify-between gap-3 p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1A2840' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-semibold text-white truncate">{imp.filename}</p>
                  <span className="text-2xs px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
                    {imp.source_label ?? imp.source}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {imp.nb_commandes && (
                    <p className="num text-2xs text-[#8B9BB4]">{fmt.number(imp.nb_commandes)} cmd</p>
                  )}
                  {imp.ca_total && (
                    <p className="num text-2xs text-[#8B9BB4]">{fmt.currency(imp.ca_total)}</p>
                  )}
                  {imp.new_rows != null && (
                    <p className="text-2xs text-[#4A5568]">+{fmt.number(imp.new_rows)} lignes</p>
                  )}
                  <p className="text-2xs text-[#4A5568]">
                    {new Date(imp.imported_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleRollback(imp.id)}
                disabled={rolling === imp.id}
                className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-2xs font-semibold transition hover:bg-[#1A2840]"
                style={{ color: '#4A5568', border: '1px solid #1A2840' }}
                title="Annuler cet import"
              >
                {rolling === imp.id
                  ? <RefreshCw size={11} className="animate-spin" />
                  : <RotateCcw size={11} strokeWidth={2} />
                }
                Annuler
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function Import() {
  const [states, setStates] = useState({})
  const { activeEdition }   = useEdition()
  const editionId   = activeEdition?.id   ?? ''
  const editionName = activeEdition?.name ?? ''

  const handleDrop = useCallback(async (id, file) => {
    setStates(s => ({ ...s, [id]: { file, status: 'loading' } }))
    const slot = SLOTS.find(s => s.id === id)
    const form = new FormData()
    form.append('file', file)

    let url = `${API}${slot.endpoint}?source=${slot.sourceParam}`
    if (editionId) url += `&edition_id=${encodeURIComponent(editionId)}`

    // Pour la conso, utiliser l'endpoint dédié qui persiste profil + KPIs
    if (id === 'conso') {
      url = `${API}/api/upload/conso`
      if (editionId) url += `?edition_id=${encodeURIComponent(editionId)}`
    }

    try {
      const res = await fetch(url, { method: 'POST', body: form })
      if (!res.ok) throw new Error(`Erreur ${res.status}`)
      const result = await res.json()
      setStates(s => ({ ...s, [id]: { file, status: 'success', result } }))
    } catch (e) {
      setStates(s => ({ ...s, [id]: { file, status: 'error', error: e.message } }))
    }
  }, [editionId])

  const handleRemove = useCallback(id => {
    setStates(s => ({ ...s, [id]: undefined }))
  }, [])

  const allLoaded = SLOTS.every(s => states[s.id]?.status === 'success')

  return (
    <div className="space-y-6 animate-slide-up max-w-4xl">

      {/* Bandeau édition active */}
      <div className="p-4 rounded-2xl flex items-center justify-between gap-4"
        style={{
          background: editionId ? 'rgba(99,102,241,0.07)' : 'rgba(245,158,11,0.07)',
          border:     `1px solid ${editionId ? 'rgba(99,102,241,0.2)' : 'rgba(245,158,11,0.2)'}`,
        }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: editionId ? 'rgba(99,102,241,0.15)' : 'rgba(245,158,11,0.12)' }}>
            {editionId
              ? <Link size={14} style={{ color: '#A5B4FC' }} strokeWidth={2} />
              : <AlertTriangle size={14} style={{ color: '#F59E0B' }} strokeWidth={2} />
            }
          </div>
          <div>
            {editionId ? (
              <>
                <p className="text-sm font-semibold text-white">
                  Édition active : <span style={{ color: '#A5B4FC' }}>{editionName}</span>
                </p>
                <p className="text-xs text-[#8B9BB4] mt-0.5">
                  Les imports seront liés à cette édition et disponibles pour les rapports IA.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold" style={{ color: '#F59E0B' }}>
                  Aucune édition sélectionnée
                </p>
                <p className="text-xs text-[#8B9BB4] mt-0.5">
                  Choisissez une édition dans le sélecteur en haut à droite avant d'importer.
                </p>
              </>
            )}
          </div>
        </div>
        {editionId && (
          <span className="text-2xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0"
            style={{ background: 'rgba(99,102,241,0.15)', color: '#A5B4FC', border: '1px solid rgba(99,102,241,0.25)' }}>
            ID : {editionId.slice(0, 8)}…
          </span>
        )}
      </div>

      {/* Slots d'import */}
      <div className="grid xl:grid-cols-2 gap-5">
        {SLOTS.map(slot => (
          <FileSlot
            key={slot.id}
            slot={slot}
            state={states[slot.id]}
            onDrop={handleDrop}
            onRemove={handleRemove}
            editionId={editionId}
            editionName={editionName}
          />
        ))}
      </div>

      {/* Confirmation toutes sources chargées */}
      {allLoaded && (
        <div className="p-4 rounded-2xl flex items-center gap-4 animate-slide-up"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <CheckCircle size={20} className="text-[#10B981] flex-shrink-0" strokeWidth={2} />
          <div>
            <p className="text-sm font-semibold text-[#10B981]">Toutes les sources sont importées</p>
            <p className="text-xs text-[#8B9BB4] mt-0.5">
              Les modules analytiques sont alimentés.
              {editionId && ` Les données sont liées à "${editionName}" et disponibles pour les rapports IA.`}
            </p>
          </div>
        </div>
      )}

      {/* Historique des imports */}
      <ImportHistory editionId={editionId} />

      {/* Formats acceptés */}
      <div className="rounded-2xl p-5" style={{ background: '#0D1526', border: '1px solid #1A2840' }}>
        <div className="flex items-center gap-2 mb-4">
          <Info size={14} style={{ color: '#8B9BB4' }} strokeWidth={1.8} />
          <p className="text-sm font-semibold text-white">Formats et sources acceptés</p>
        </div>
        <div className="grid xl:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#4A5568', fontSize: '0.6rem' }}>
              Formats de fichiers
            </p>
            <div className="flex flex-wrap gap-2">
              {['.xlsx', '.xls', '.csv', '.parquet', '.json', '.tsv'].map(f => (
                <span key={f} className="text-xs font-mono px-2 py-1 rounded"
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#8B9BB4', border: '1px solid #1A2840' }}>
                  {f}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#4A5568', fontSize: '0.6rem' }}>
              Sources billetterie reconnues
            </p>
            <div className="flex flex-wrap gap-2">
              {['Weezevent', 'Bizouk', 'BilletWeb', 'Eventbrite', 'Shotgun', 'Ticketmaster', 'Generic'].map(s => (
                <span key={s} className="text-xs px-2 py-1 rounded"
                  style={{ background: 'rgba(245,158,11,0.08)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.15)' }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1A2840' }}>
          <p className="text-xs text-[#8B9BB4] leading-relaxed">
            La source est détectée automatiquement à l'import. Les doublons sont éliminés par identifiant de commande.
            Re-importer un fichier déjà chargé ne crée pas de doublon.
          </p>
        </div>
      </div>

    </div>
  )
}
