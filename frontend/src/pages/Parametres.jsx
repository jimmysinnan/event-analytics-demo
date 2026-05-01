import { useState, useRef, useCallback } from 'react'
import {
  Upload, CheckCircle, AlertCircle, FileSpreadsheet,
  Trash2, RefreshCw, Database, Zap, HardDrive, Info
} from 'lucide-react'
import SectionCard from '../components/ui/SectionCard'
import { fmt } from '../lib/format'

const SLOTS = [
  {
    id:    'conso',
    label: 'Données de consommation',
    sub:   'Export Weezpay — onglet BDD ou JDD Vente',
    icon:  Database,
    color: '#068EEA',
    hint:  'export_consommation_20XX.xlsx · export_ventes_20XX.xlsx',
    endpoint: '/api/upload/conso',
    modules: ['Consommation', 'Profil Client', 'Invitations', 'Stocks'],
  },
  {
    id:    'billetterie',
    label: 'TDB Billetterie',
    sub:   'Fichier TDB billetterie 20XX.xlsx',
    icon:  FileSpreadsheet,
    color: '#F59E0B',
    hint:  'TDB billetterie 2025.xlsx — tous onglets requis',
    endpoint: '/api/upload/billetterie',
    modules: ['Billetterie', 'Invitations', 'Vue Globale'],
  },
]

function FileSlot({ slot, state, onDrop, onRemove }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const { icon: Icon, color } = slot

  const handleDrop = useCallback(e => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer?.files?.[0] ?? e.target?.files?.[0]
    if (file) onDrop(slot.id, file)
  }, [slot.id, onDrop])

  const status = state?.status ?? 'idle'

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200"
      style={{
        background: dragging ? `${color}10` : '#0D1526',
        border: `1px solid ${dragging ? color : status === 'success' ? '#10B981' : status === 'error' ? '#EF4444' : '#1A2840'}`,
        boxShadow: dragging ? `0 0 24px ${color}20` : 'none',
      }}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {/* Header */}
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

      {/* Drop zone */}
      {!state?.file ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-3 py-8 rounded-xl border-2 border-dashed
                     transition-all duration-200 hover:border-opacity-80 cursor-pointer w-full"
          style={{ borderColor: `${color}40`, background: `${color}05` }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${color}18` }}>
            <Upload size={20} style={{ color }} strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-white">Déposer le fichier ici</p>
            <p className="text-xs text-[#8B9BB4] mt-0.5">ou cliquer pour parcourir</p>
          </div>
          <p className="text-2xs text-[#4A5568] px-4 text-center leading-snug">{slot.hint}</p>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleDrop} />
        </button>
      ) : (
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1A2840' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <FileSpreadsheet size={16} className="text-[#8B9BB4] flex-shrink-0" strokeWidth={1.8} />
              <p className="text-xs text-white font-medium truncate">{state.file.name}</p>
            </div>
            <p className="text-2xs text-[#4A5568] flex-shrink-0 ml-2">
              {(state.file.size / 1024).toFixed(0)} ko
            </p>
          </div>
        </div>
      )}

      {/* Status */}
      {status === 'loading' && (
        <div className="flex items-center gap-2">
          <RefreshCw size={14} className="animate-spin" style={{ color }} strokeWidth={2} />
          <p className="text-xs text-[#8B9BB4]">Traitement en cours…</p>
        </div>
      )}
      {status === 'success' && state.result && (
        <div className="rounded-xl p-3" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={14} className="text-[#10B981]" strokeWidth={2} />
            <p className="text-xs font-semibold text-[#10B981]">Importé avec succès</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {state.result.meta && (
              <>
                <div>
                  <p className="text-2xs text-[#4A5568]">Lignes traitées</p>
                  <p className="num text-sm font-bold text-white">{fmt.number(state.result.meta.rows)}</p>
                </div>
                <div>
                  <p className="text-2xs text-[#4A5568]">Onglet</p>
                  <p className="text-xs font-medium text-white truncate">{state.result.meta.sheet}</p>
                </div>
              </>
            )}
            {state.result.kpi && (
              <>
                <div>
                  <p className="text-2xs text-[#4A5568]">CA HT calculé</p>
                  <p className="num text-sm font-bold text-white">{fmt.currency(state.result.kpi.ca_ht)}</p>
                </div>
                <div>
                  <p className="text-2xs text-[#4A5568]">Clients uniques</p>
                  <p className="num text-sm font-bold text-white">{fmt.number(state.result.kpi.n_clients)}</p>
                </div>
              </>
            )}
            {state.result.kpi_billetterie && (
              <>
                <div>
                  <p className="text-2xs text-[#4A5568]">Scans entrée</p>
                  <p className="num text-sm font-bold text-white">{fmt.number(state.result.kpi_billetterie.total_scans)}</p>
                </div>
                <div>
                  <p className="text-2xs text-[#4A5568]">Invitations scannées</p>
                  <p className="num text-sm font-bold text-white">{fmt.number(state.result.kpi_billetterie.nb_invitations_scannees)}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 p-3 rounded-xl"
          style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={14} className="text-[#EF4444] flex-shrink-0" strokeWidth={2} />
          <p className="text-xs text-[#EF4444]">{state.error ?? 'Erreur de traitement'}</p>
        </div>
      )}

      {/* Modules alimentés */}
      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-[#1A2840]">
        <p className="text-2xs text-[#4A5568] w-full mb-0.5">Modules alimentés :</p>
        {slot.modules.map(m => (
          <span key={m} className="text-2xs px-2 py-0.5 rounded-full"
            style={{
              background: status === 'success' ? `${color}15` : 'rgba(74,85,104,0.2)',
              color: status === 'success' ? color : '#4A5568',
              border: `1px solid ${status === 'success' ? `${color}30` : 'transparent'}`,
            }}>
            {m}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function Parametres() {
  const [states, setStates] = useState({})

  const handleDrop = useCallback(async (id, file) => {
    setStates(s => ({ ...s, [id]: { file, status: 'loading' } }))
    const slot = SLOTS.find(s => s.id === id)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch(`http://localhost:8001${slot.endpoint}`, { method: 'POST', body: form })
      if (!res.ok) throw new Error(`Erreur ${res.status}`)
      const result = await res.json()
      setStates(s => ({ ...s, [id]: { file, status: 'success', result } }))
    } catch (e) {
      setStates(s => ({ ...s, [id]: { file, status: 'error', error: e.message } }))
    }
  }, [])

  const handleRemove = useCallback(id => {
    setStates(s => ({ ...s, [id]: undefined }))
  }, [])

  const allLoaded = SLOTS.every(s => states[s.id]?.status === 'success')

  return (
    <div className="space-y-6 animate-slide-up max-w-4xl">

      {/* Intro */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: HardDrive,    label: 'Données locales',      sub: 'Aucune donnée ne quitte votre poste', color: '#10B981' },
          { icon: Zap,          label: 'Traitement instantané', sub: 'Calcul immédiat de tous les KPI',     color: '#068EEA' },
          { icon: RefreshCw,    label: 'Mise à jour flexible',  sub: 'Re-importer à tout moment',           color: '#8B5CF6' },
        ].map(({ icon: Icon, label, sub, color }) => (
          <div key={label} className="card p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}18` }}>
              <Icon size={15} style={{ color }} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">{label}</p>
              <p className="text-2xs text-[#8B9BB4] mt-0.5 leading-snug">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Upload slots */}
      <div className="grid xl:grid-cols-2 gap-5">
        {SLOTS.map(slot => (
          <FileSlot
            key={slot.id}
            slot={slot}
            state={states[slot.id]}
            onDrop={handleDrop}
            onRemove={handleRemove}
          />
        ))}
      </div>

      {/* Status global */}
      {allLoaded && (
        <div className="p-4 rounded-2xl flex items-center gap-4 animate-slide-up"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <CheckCircle size={20} className="text-[#10B981] flex-shrink-0" strokeWidth={2} />
          <div>
            <p className="text-sm font-semibold text-[#10B981]">Toutes les sources sont chargées</p>
            <p className="text-xs text-[#8B9BB4] mt-0.5">Les modules sont alimentés avec les données importées. Naviguez dans le menu pour explorer les analyses.</p>
          </div>
        </div>
      )}

      {/* Infos sources statiques */}
      <SectionCard
        title="Données de référence pré-chargées"
        subtitle="Disponibles sans import — extraites lors de la configuration initiale"
        action={
          <span className="text-2xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: 'rgba(6,142,234,0.12)', color: '#21AAFA', border: '1px solid rgba(6,142,234,0.2)' }}>
            Toujours actif
          </span>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Consommation 2023',        rows: '94 115 lignes', src: 'export_consommation_2023.xlsx',       ok: true  },
            { label: 'Consommation 2024',        rows: '71 269 lignes', src: 'export_consommation_2024.xlsx',       ok: true  },
            { label: 'Consommation 2025',        rows: '91 037 lignes', src: 'export_consommation_2025.xlsx',       ok: true  },
            { label: 'Billetterie 2024',         rows: '9 078 billets', src: 'export_billetterie_2024.xlsx',        ok: true  },
            { label: 'TDB Billetterie 2025',     rows: '19 onglets',    src: 'tdb_billetterie_2025.xlsx',           ok: true  },
            { label: 'Stocks édition+1',         rows: '5 zones × 7h', src: 'previsions_stock_edition_n1.xlsx',    ok: true  },
            { label: 'Profil client (formulaire)',rows: '3 299 rép.',   src: 'formulaire_participant_2025.xlsx',    ok: true  },
            { label: 'Données 2022',             rows: '~100k lignes',  src: 'export_historique_2022.xlsx',         ok: false },
          ].map(({ label, rows, src, ok }) => (
            <div key={label} className="flex items-start gap-2.5 p-2.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${ok ? '#1A2840' : '#1A2840'}` }}>
              <div className="mt-0.5 flex-shrink-0">
                {ok
                  ? <CheckCircle size={13} className="text-[#10B981]" strokeWidth={2} />
                  : <Info size={13} className="text-[#4A5568]" strokeWidth={2} />
                }
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-white leading-tight">{label}</p>
                <p className="num text-2xs text-[#8B9BB4] mt-0.5">{rows}</p>
                <p className="text-2xs text-[#4A5568] truncate mt-0.5">{src}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

    </div>
  )
}
