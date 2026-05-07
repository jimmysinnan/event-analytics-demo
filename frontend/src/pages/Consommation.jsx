import { useState, useEffect, useRef, useCallback } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import {
  ShoppingCart, Euro, Users, Star, Info,
  RefreshCw, Upload, CheckCircle, AlertCircle,
  RotateCcw, X
} from 'lucide-react'
import KpiCard     from '../components/ui/KpiCard'
import SectionCard from '../components/ui/SectionCard'
import EmptyState  from '../components/ui/EmptyState'
import MultiSelect from '../components/ui/MultiSelect'
import { fmt }     from '../lib/format'
import { useEdition } from '../context/EditionContext'
import { CONSO, OVERVIEW } from '../lib/editionsData'
import { IS_DEMO } from '../lib/appMode'
import { API } from '../lib/api'

// ── Données démo ──────────────────────────────────────────────────────────────
const CA_HORAIRE_2025 = [
  { label: '15h', ca_ht: 1349  }, { label: '16h', ca_ht: 10816 }, { label: '17h', ca_ht: 30879 },
  { label: '18h', ca_ht: 50965 }, { label: '19h', ca_ht: 70942 }, { label: '20h', ca_ht: 57416 },
  { label: '21h', ca_ht: 50408 }, { label: '22h', ca_ht: 30528 }, { label: '23h', ca_ht: 19100 },
]
const TOP_ARTICLES_2025 = [
  { art: 'Champagne (toutes marques)', qty: 4540 },
  { art: 'Boisson Soft 1',            qty: 3858 },
  { art: 'Boisson Soft 2',            qty: 3719 },
  { art: 'Bière Signature',           qty: 2301 },
  { art: 'Cocktail Signature',        qty: 1628 },
  { art: 'Cocktail Tropical',         qty: 1447 },
]

// ── Tooltip ───────────────────────────────────────────────────────────────────
function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2.5 text-xs" style={{ background: '#111D33', border: '1px solid #1A2840' }}>
      <p className="font-semibold text-[#8B9BB4] uppercase tracking-wider mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="num font-semibold" style={{ color: p.color || '#F0F4FF' }}>
          {p.name}: {p.dataKey === 'qty' ? fmt.number(p.value) : fmt.currency(p.value)}
        </p>
      ))}
    </div>
  )
}

function NoDataSmall({ detail }) {
  return (
    <div className="flex flex-col items-center justify-center py-5 gap-1.5"
      style={{ background: 'rgba(74,85,104,0.07)', borderRadius: '0.75rem', border: '1px dashed #1A2840' }}>
      <Info size={14} className="text-[#4A5568]" strokeWidth={1.5} />
      <p className="text-xs text-[#4A5568] text-center leading-snug px-3">{detail}</p>
    </div>
  )
}


// ── Barre horizontale ─────────────────────────────────────────────────────────
function HBar({ label, value, max, color = '#068EEA', labelFmt = v => fmt.currency(v) }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <p className="text-xs text-[#8B9BB4] truncate pr-2">{label}</p>
        <p className="num text-xs font-semibold text-white flex-shrink-0">{labelFmt(value)}</p>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: '#1A2840' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ── Liste acheteurs — format compact (nom prénom + id + valeur) ───────────────
function AcheteurList({ rows, valueKey, valueFmt }) {
  if (!rows?.length) return (
    <NoDataSmall detail="Colonnes 'ID acheteur' absente ou aucune donnée disponible." />
  )
  return (
    <div className="space-y-2 mt-1">
      {rows.map((r, i) => {
        const nom    = r.nom    && r.nom    !== 'nan' ? r.nom    : null
        const prenom = r.prenom && r.prenom !== 'nan' ? r.prenom : null
        const fullName = [prenom, nom].filter(Boolean).join(' ') || null
        return (
          <div key={r.id + i} className="flex items-center gap-3">
            <span className="num text-2xs font-bold w-5 flex-shrink-0 text-center"
              style={{ color: '#4A5568' }}>{i + 1}</span>
            <div className="flex-1 min-w-0">
              {fullName
                ? <p className="text-xs font-semibold text-white truncate">{fullName}</p>
                : null
              }
              <p className="font-mono truncate"
                style={{ fontSize: '0.65rem', color: '#4A5568' }}
                title={r.id}>{String(r.id)}</p>
            </div>
            <p className="num text-xs font-semibold text-white flex-shrink-0">
              {valueFmt(r[valueKey])}
            </p>
          </div>
        )
      })}
    </div>
  )
}

// ── Zone upload conso ─────────────────────────────────────────────────────────
function ConsoUpload({ editionId, onSuccess }) {
  const inputRef = useRef(null)
  const [status,  setStatus]  = useState('idle')
  const [message, setMessage] = useState('')

  const handleFile = useCallback(async (file) => {
    if (!file) return
    setStatus('loading'); setMessage('')
    const form = new FormData()
    form.append('file', file)
    let url = `${API}/api/upload/conso`
    if (editionId) url += `?edition_id=${encodeURIComponent(editionId)}`
    try {
      const res = await fetch(url, { method: 'POST', body: form })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `Erreur ${res.status}`) }
      const result = await res.json()
      setStatus('ok')
      setMessage(`Import réussi · ${fmt.currency(result.kpi?.ca_ht ?? 0)} CA HT`)
      onSuccess?.()
    } catch (e) { setStatus('error'); setMessage(e.message) }
  }, [editionId, onSuccess])

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#0D1526', border: '1px solid #1A2840' }}>
      <div
        className="flex flex-col items-center justify-center gap-3 py-5 cursor-pointer transition-colors hover:bg-[#111D33]"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
      >
        {status === 'loading' && <RefreshCw size={18} className="animate-spin text-[#068EEA]" />}
        {status === 'ok'      && <CheckCircle size={18} className="text-[#10B981]" />}
        {status === 'error'   && <AlertCircle size={18} className="text-[#EF4444]" />}
        {status === 'idle'    && <Upload size={18} style={{ color: '#068EEA' }} strokeWidth={1.5} />}
        <div className="text-center">
          <p className="text-sm font-semibold text-white">
            {status === 'idle' ? 'Importer / Actualiser le fichier conso'
              : status === 'loading' ? 'Analyse en cours…'
              : status === 'ok' ? 'Import réussi' : 'Erreur'}
          </p>
          <p className="text-xs mt-0.5" style={{
            color: status === 'ok' ? '#10B981' : status === 'error' ? '#EF4444' : '#8B9BB4'
          }}>
            {message || 'Export Weezpay (.xlsx, .xls, .csv) · onglet BDD ou JDD Vente'}
          </p>
        </div>
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
          onChange={e => handleFile(e.target.files[0])} />
      </div>
    </div>
  )
}

// ── Hook fetch summary ────────────────────────────────────────────────────────
function useLiveConso(editionId, trigger) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (IS_DEMO || !editionId) { setData(null); return }
    setLoading(true)
    fetch(`${API}/api/editions/${editionId}/summary`)
      .then(r => r.ok ? r.json() : null)
      .then(s  => setData(s?.conso ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [editionId, trigger])
  return { data, loading }
}

// ── Combiner des courbes horaires (multi-select PDV) ──────────────────────────
function combineHoraire(arrays) {
  const map = {}
  for (const arr of (arrays || [])) {
    for (const point of (arr || [])) {
      if (!map[point.heure]) map[point.heure] = { heure: point.heure, label: point.label, ca_ht: 0 }
      map[point.heure].ca_ht += point.ca_ht
    }
  }
  return Object.values(map).sort((a, b) => a.heure - b.heure)
}

// ── Helpers couleurs PDV ──────────────────────────────────────────────────────
const PDV_COLORS = ['#F59E0B', '#068EEA', '#10B981', '#6366F1', '#EF4444', '#EC4899', '#8B5CF6']

// ── Page principale ───────────────────────────────────────────────────────────
export default function Consommation() {
  const { year, activeEdition } = useEdition()
  const [tab,           setTab]           = useState('analyse')
  const [uploadTrigger, setUploadTrigger] = useState(0)

  // Données démo
  const d    = IS_DEMO ? CONSO[year]     : null
  const prev = IS_DEMO ? CONSO[year - 1] : null

  // Données live
  const { data: liveKpi, loading: liveLoading } = useLiveConso(activeEdition?.id, uploadTrigger)

  // ── Filtres multi-select (réinitialisables) ────────────────────────────────
  const [filterArticles, setFilterArticles]     = useState([]) // Tous les onglets
  const [filterPdvTypes, setFilterPdvTypes]     = useState([]) // Types BAR/FOOD/MERCH
  const [filterPdvNames, setFilterPdvNames]     = useState([]) // PDVs BAR pour horaire

  function resetFilters() {
    setFilterArticles([])
    setFilterPdvTypes([])
    setFilterPdvNames([])
  }

  const hasActiveFilters = filterArticles.length > 0 || filterPdvTypes.length > 0 || filterPdvNames.length > 0

  // ── Rollback conso ─────────────────────────────────────────────────────────
  const [rolling, setRolling] = useState(false)
  async function handleRollback() {
    if (!activeEdition?.id) return
    if (!window.confirm('Supprimer toutes les données conso importées pour cette édition ?')) return
    setRolling(true)
    try {
      await fetch(`${API}/api/conso/${activeEdition.id}`, { method: 'DELETE' })
      setUploadTrigger(t => t + 1)
      resetFilters()
    } catch { /* ignore */ }
    setRolling(false)
  }

  // KPI deltas (démo uniquement)
  const delta_ca      = d && prev ? fmt.delta(d.ca,           prev.ca)           : null
  const delta_cli     = d && prev ? fmt.delta(d.clients,      prev.clients)      : null
  const delta_transac = d && prev ? fmt.delta(d.transactions, prev.transactions) : null
  const delta_panier  = d && prev ? fmt.delta(d.panier,       prev.panier)       : null

  const demoPic = CA_HORAIRE_2025.reduce((a, b) => b.ca_ht > a.ca_ht ? b : a)

  // ── Options pour les filtres ──────────────────────────────────────────────
  const articleOptions     = (liveKpi?.top_articles ?? []).map(a => ({ value: a.art, label: `${a.art} (${fmt.number(a.qty)})` }))
  const articleOptionsBar  = (liveKpi?.top_articles_bar ?? []).map(a => ({ value: a.art, label: `${a.art} (${fmt.number(a.qty)})` }))
  const pdvTypeOptions     = [...new Set([...(liveKpi?.top_pdv_type ?? []).map(t => t.type)])].map(t => ({ value: t, label: t }))
  // Tous les noms de PDV (pas seulement BAR) — label avec type si connu
  const pdvNameOptions     = (liveKpi?.top_pdv_name ?? []).map(p => {
    const type = liveKpi?.pdv_name_type_map?.[p.pdv] ?? ''
    return { value: p.pdv, label: type ? `${p.pdv} (${type})` : p.pdv }
  })

  // ── Articles filtrés ──────────────────────────────────────────────────────
  const filteredArticles    = filterArticles.length === 0
    ? (liveKpi?.top_articles ?? []).slice(0, 15)
    : (liveKpi?.top_articles ?? []).filter(a => filterArticles.includes(a.art))

  const filteredArticlesBar = filterArticles.length === 0
    ? (liveKpi?.top_articles_bar ?? []).slice(0, 15)
    : (liveKpi?.top_articles_bar ?? []).filter(a => filterArticles.includes(a.art))

  // ── PDV filtrés ───────────────────────────────────────────────────────────
  const pdvNameTypeMap   = liveKpi?.pdv_name_type_map ?? {}
  const filteredPdvType  = filterPdvTypes.length === 0
    ? (liveKpi?.top_pdv_type ?? [])
    : (liveKpi?.top_pdv_type ?? []).filter(t => filterPdvTypes.includes(t.type))

  const filteredPdvName  = filterPdvTypes.length === 0
    ? (liveKpi?.top_pdv_name ?? [])
    : (liveKpi?.top_pdv_name ?? []).filter(p => filterPdvTypes.includes(pdvNameTypeMap[p.pdv] ?? ''))

  // ── Courbe horaire : filtre PDV → seulement les PDVs de type BAR ────────────
  // Si aucun PDV sélectionné : total tous bars. Sinon : somme des PDVs BAR sélectionnés.
  const filteredHoraire = (() => {
    if (!liveKpi) return []
    if (filterPdvNames.length === 0) return liveKpi.ca_horaire ?? []
    const typeMap = liveKpi.pdv_name_type_map ?? {}
    const barPdvs = filterPdvNames.filter(n => (typeMap[n] ?? '').toUpperCase() === 'BAR')
    if (barPdvs.length === 0) return [] // aucun PDV BAR dans la sélection
    const arrays = barPdvs.map(n => liveKpi.ca_horaire_by_pdv?.[n] ?? [])
    return combineHoraire(arrays)
  })()
  const livePic = filteredHoraire.length > 0
    ? filteredHoraire.reduce((a, b) => b.ca_ht > a.ca_ht ? b : a)
    : null

  return (
    <div className="space-y-5 animate-slide-up">

      {/* Bandeau + tabs + actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl flex-1"
          style={{ background: 'rgba(6,142,234,0.07)', border: '1px solid rgba(6,142,234,0.15)' }}>
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#068EEA' }} />
          <p className="text-xs text-[#8B9BB4] truncate">
            <span className="text-white font-semibold">{activeEdition?.name ?? year}</span>
            {IS_DEMO && d ? ` — Source : ${d.plateforme}` : ''}
            {!IS_DEMO && liveKpi ? ` — ${liveKpi.filename || 'Fichier importé'}` : ''}
            {!IS_DEMO && !liveKpi && !liveLoading ? ' — Aucun fichier importé' : ''}
          </p>
          {liveLoading && <RefreshCw size={12} className="animate-spin text-[#4A5568] flex-shrink-0" />}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasActiveFilters && (
            <button onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition hover:opacity-80"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }}>
              <X size={11} strokeWidth={2.5} />
              Réinitialiser les filtres
            </button>
          )}
          {!IS_DEMO && liveKpi && (
            <button onClick={handleRollback} disabled={rolling}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition hover:opacity-80"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              {rolling
                ? <RefreshCw size={11} className="animate-spin" />
                : <RotateCcw size={11} strokeWidth={2} />
              }
              Retour arrière
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl flex-shrink-0"
          style={{ background: '#0D1526', border: '1px solid #1A2840' }}>
          {[{ id: 'analyse', label: `Analyse ${year}` }, { id: 'live', label: 'Suivi live' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
              style={tab === t.id
                ? { background: 'rgba(6,142,234,0.15)', color: '#21AAFA', border: '1px solid rgba(6,142,234,0.25)' }
                : { color: '#8B9BB4', border: '1px solid transparent' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="CA Consommation"
          value={IS_DEMO ? (d ? fmt.currency(d.ca) : '—') : (liveKpi?.ca_ht ? fmt.currency(liveKpi.ca_ht) : '—')}
          sub={IS_DEMO ? (d ? 'Hors frais & consignes' : `Indisponible ${year}`) : (liveKpi ? 'Hors frais & consignes' : 'Importez la consommation')}
          delta={delta_ca} accent="blue" icon={Euro} />
        <KpiCard label="Clients acheteurs"
          value={IS_DEMO ? (d ? fmt.number(d.clients) : '—') : (liveKpi?.n_clients ? fmt.number(liveKpi.n_clients) : '—')}
          sub="Clients uniques" delta={delta_cli} accent="teal" icon={Users} />
        <KpiCard label="Transactions"
          value={IS_DEMO ? (d ? fmt.number(d.transactions) : '—') : (liveKpi?.n_transac ? fmt.number(liveKpi.n_transac) : '—')}
          sub="Uniques" delta={delta_transac} accent="gold" icon={ShoppingCart} />
        <KpiCard label="Panier moyen"
          value={IS_DEMO ? (d ? fmt.currency(d.panier) : '—') : (liveKpi?.panier_moyen ? fmt.currency(liveKpi.panier_moyen) : '—')}
          sub="CA HT / client" delta={delta_panier} accent="violet" icon={Star} />
      </div>

      {/* ══ Onglet Analyse ══════════════════════════════════════════════════════ */}
      {tab === 'analyse' && (<>
        {!IS_DEMO && !liveKpi && !liveLoading && (
          <EmptyState
            message="Aucune donnée de consommation importée"
            hint="Importez un fichier Weezpay (onglet BDD ou JDD Vente) depuis la page Importer données."
          />
        )}

        {!IS_DEMO && liveKpi && (<>

          {/* Filtres communs */}
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 p-4 rounded-2xl"
            style={{ background: '#0D1526', border: '1px solid #1A2840' }}>
            <MultiSelect
              label="Filtrer par type PDV"
              options={pdvTypeOptions}
              selected={filterPdvTypes}
              onChange={setFilterPdvTypes}
              placeholder="Tous les types (BAR, FOOD, MERCH…)"
            />
            <MultiSelect
              label="Filtrer par article"
              options={articleOptions}
              selected={filterArticles}
              onChange={setFilterArticles}
              placeholder="Tous les articles"
            />
          </div>

          {/* Ligne 1 : CA horaire + CA par type PDV */}
          <div className="grid xl:grid-cols-2 gap-4">
            <SectionCard title="CA horaire — bars uniquement"
              subtitle={livePic ? `Pic à ${livePic.label} · ${fmt.currency(livePic.ca_ht)}` : 'CA par heure'}>
              {filteredHoraire.length > 1 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={filteredHoraire}>
                    <defs>
                      <linearGradient id="gradH" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#068EEA" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#068EEA" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1A2840" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#8B9BB4', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#8B9BB4', fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={v => `${(v/1000).toFixed(0)}k`} width={32} />
                    <Tooltip content={<Tip />} />
                    <Area type="monotone" dataKey="ca_ht" name="CA HT" stroke="#068EEA" strokeWidth={2}
                      fill="url(#gradH)" dot={false} activeDot={{ r: 4, fill: '#068EEA' }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <NoDataSmall detail="Colonne 'Heure transaction' absente ou aucun PDV de type BAR." />}
            </SectionCard>

            <SectionCard title="CA par type de point de vente" subtitle="BAR · FOOD · MERCH…">
              {filteredPdvType.length > 0 ? (
                <div className="space-y-2.5 mt-1">
                  {filteredPdvType.map((t, i) => (
                    <HBar key={t.type} label={t.type} value={t.ca}
                      max={filteredPdvType[0].ca}
                      color={PDV_COLORS[i] ?? '#2A3850'} />
                  ))}
                </div>
              ) : <NoDataSmall detail="Colonne 'Type de point de vente' absente ou filtre actif sans résultat." />}
            </SectionCard>
          </div>

          {/* Ligne 2 : Famille + Top articles */}
          <div className="grid xl:grid-cols-2 gap-4">
            <SectionCard title="CA par famille d'articles" subtitle="SUM Total HT par famille">
              {liveKpi.top_familles.length > 0 ? (
                <div className="space-y-2 mt-1">
                  {liveKpi.top_familles.slice(0, 10).map((f, i) => (
                    <HBar key={f.name} label={f.name} value={f.ca}
                      max={liveKpi.top_familles[0].ca}
                      color={i === 0 ? '#F59E0B' : i < 3 ? '#068EEA' : '#2A3850'} />
                  ))}
                </div>
              ) : <NoDataSmall detail="Colonne 'Famille d'articles' absente dans ce fichier." />}
            </SectionCard>

            <SectionCard title={`Top articles — volume ${year}`} subtitle="SUM quantité par article">
              {filteredArticles.length > 0 ? (
                <div className="space-y-2 mt-1">
                  {filteredArticles.map((a, i) => (
                    <div key={a.art} className="flex items-center gap-2.5">
                      {filterArticles.length === 0 && (
                        <span className="num text-2xs font-bold w-4 text-[#4A5568] flex-shrink-0">{i + 1}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-0.5">
                          <p className="text-xs text-[#8B9BB4] truncate pr-2">{a.art}</p>
                          <p className="num text-xs font-semibold text-white flex-shrink-0">{fmt.number(a.qty)}</p>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ background: '#1A2840' }}>
                          <div className="h-full rounded-full" style={{
                            width: `${(a.qty / (liveKpi.top_articles[0]?.qty || 1)) * 100}%`,
                            background: i === 0 && filterArticles.length === 0 ? '#F59E0B' : '#068EEA'
                          }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <NoDataSmall detail="Aucun article correspondant au filtre actif." />}
            </SectionCard>
          </div>

          {/* Ligne 3 : CA par PDV nom filtré */}
          {filteredPdvName.length > 0 && (
            <SectionCard title="CA par point de vente (détail)"
              subtitle={filterPdvTypes.length > 0 ? `Types : ${filterPdvTypes.join(', ')}` : 'Tous types confondus'}>
              <div className="grid xl:grid-cols-2 gap-x-8 gap-y-2 mt-1">
                {filteredPdvName.slice(0, 12).map((p, i) => (
                  <HBar key={p.pdv} label={p.pdv} value={p.ca}
                    max={filteredPdvName[0].ca}
                    color={i === 0 ? '#F59E0B' : '#068EEA'} />
                ))}
              </div>
            </SectionCard>
          )}
        </>)}

        {/* Démo */}
        {IS_DEMO && (<>
          <div className="grid xl:grid-cols-3 gap-4">
            <SectionCard title="CA horaire bars"
              subtitle={year === 2025 ? `Pic à ${demoPic.label} · ${fmt.currency(demoPic.ca_ht)}` : 'Disponible 2025'}>
              {year === 2025 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={CA_HORAIRE_2025}>
                    <defs>
                      <linearGradient id="gradHD" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#068EEA" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#068EEA" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1A2840" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#8B9BB4', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#8B9BB4', fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={v => `${(v/1000).toFixed(0)}k`} width={28} />
                    <Tooltip content={<Tip />} />
                    <Area type="monotone" dataKey="ca_ht" name="CA HT" stroke="#068EEA" strokeWidth={2}
                      fill="url(#gradHD)" dot={false} activeDot={{ r: 4, fill: '#068EEA' }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <NoDataSmall detail="CA horaire disponible uniquement pour 2025" />}
            </SectionCard>

            <SectionCard title={`CA par point de vente — ${year}`} subtitle="Top zones · hors frais" className="xl:col-span-2">
              {d?.pdv ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={d.pdv} layout="vertical" barSize={14} margin={{ left: 0, right: 8 }}>
                    <CartesianGrid horizontal={false} stroke="#1A2840" strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fill: '#8B9BB4', fontSize: 9 }} axisLine={false} tickLine={false}
                      tickFormatter={v => `${(v/1000).toFixed(0)}k€`} />
                    <YAxis type="category" dataKey="short" tick={{ fill: '#8B9BB4', fontSize: 10 }}
                      axisLine={false} tickLine={false} width={72} />
                    <Tooltip content={<Tip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="ca" name="CA HT" radius={[0, 4, 4, 0]}>
                      {d.pdv.map((_, i) => <Cell key={i} fill={i === 0 ? '#F59E0B' : i < 3 ? '#068EEA' : '#2A3850'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <NoDataSmall detail="Détail PDV non disponible pour cette édition" />}
            </SectionCard>
          </div>

          <div className="grid xl:grid-cols-2 gap-4">
            <SectionCard title="CA par famille produit" subtitle="Comparatif 2023 · 2024 · 2025">
              <div className="space-y-3 mt-1">
                {(() => {
                  const allNames = [...new Set([2023,2024,2025].flatMap(y => (CONSO[y]?.familles ?? []).map(f => f.name)))]
                  const getCA = (yr, nm) => CONSO[yr]?.familles?.find(f => f.name === nm)?.ca ?? 0
                  const getColor = nm => CONSO[2025]?.familles?.find(f=>f.name===nm)?.color ?? CONSO[2024]?.familles?.find(f=>f.name===nm)?.color ?? '#4A5568'
                  return allNames.slice(0, 7).map(nm => {
                    const c23 = getCA(2023,nm), c24 = getCA(2024,nm), c25 = getCA(2025,nm)
                    const max = Math.max(c23,c24,c25)
                    if (!max) return null
                    return (
                      <div key={nm}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: getColor(nm) }} />
                            <p className="text-xs font-medium text-[#8B9BB4]">{nm}</p>
                          </div>
                          <div className="flex gap-3">
                            {[{y:2023,v:c23,c:'#4A5568'},{y:2024,v:c24,c:'#068EEA'},{y:2025,v:c25,c:getColor(nm)}].map(({y,v,c}) => (
                              <p key={y} className="num text-2xs font-semibold w-16 text-right"
                                style={{ color: y===year ? '#F0F4FF' : c }}>{v ? fmt.currency(v) : '—'}</p>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          {[{v:c23,c:'#4A5568'},{v:c24,c:'#068EEA'},{v:c25,c:getColor(nm)}].map(({v,c},i) => (
                            <div key={i} className="h-1 rounded-full" style={{ background: '#1A2840' }}>
                              <div className="h-full rounded-full" style={{ width: `${(v/max)*100}%`, background: c }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </SectionCard>

            <div className="space-y-4">
              <SectionCard title={`Top articles — volume ${year}`}>
                {year === 2025 ? (
                  <div className="space-y-2 mt-1">
                    {TOP_ARTICLES_2025.map(({ art, qty }, i) => (
                      <div key={art} className="flex items-center gap-3">
                        <span className="num text-2xs font-bold w-4 text-[#4A5568]">{i+1}</span>
                        <div className="flex-1">
                          <div className="flex justify-between mb-0.5">
                            <p className="text-xs text-[#8B9BB4] truncate pr-2">{art}</p>
                            <p className="num text-xs font-semibold text-white">{fmt.number(qty)}</p>
                          </div>
                          <div className="h-1.5 rounded-full" style={{ background: '#1A2840' }}>
                            <div className="h-full rounded-full"
                              style={{ width: `${(qty/TOP_ARTICLES_2025[0].qty)*100}%`, background: i===0?'#F59E0B':'#068EEA' }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <NoDataSmall detail="Top articles disponible uniquement pour 2025" />}
              </SectionCard>
              <SectionCard title="Évolution globale 2023 → 2025">
                <div className="grid grid-cols-3 gap-3 mt-1">
                  {OVERVIEW.filter(o => o.ca_conso).map(o => (
                    <div key={o.year} className="text-center p-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${o.year===year?'rgba(245,158,11,0.2)':'#1A2840'}` }}>
                      <p className="text-2xs uppercase tracking-wider mb-1.5"
                        style={{ color: o.year===year?'#F59E0B':o.year===2024?'#068EEA':'#4A5568' }}>
                        {o.year}{o.year===year&&' ✦'}
                      </p>
                      <p className="num text-sm font-bold text-white">{fmt.currency(o.ca_conso)}</p>
                      <div className="mt-1.5 space-y-0.5">
                        <p className="num text-2xs text-[#8B9BB4]">{fmt.number(o.clients)} clients</p>
                        <p className="num text-2xs text-[#8B9BB4]">{fmt.currency(o.panier)} panier</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          </div>
        </>)}
      </>)}

      {/* ══ Onglet Suivi live ════════════════════════════════════════════════════ */}
      {tab === 'live' && (
        <div className="space-y-4">
          <ConsoUpload editionId={activeEdition?.id} onSuccess={() => setUploadTrigger(t => t + 1)} />

          {!liveKpi && !liveLoading && (
            <EmptyState
              message="Aucune donnée de consommation importée"
              hint="Utilisez la zone ci-dessus pour importer votre fichier Weezpay."
            />
          )}

          {liveKpi && (<>

            {/* Filtres live */}
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 p-4 rounded-2xl"
              style={{ background: '#0D1526', border: '1px solid #1A2840' }}>
              <MultiSelect
                label="Nom de point de vente"
                options={pdvNameOptions}
                selected={filterPdvNames}
                onChange={setFilterPdvNames}
                placeholder="Tous les points de vente"
              />
              <MultiSelect
                label="Filtrer par type PDV"
                options={pdvTypeOptions}
                selected={filterPdvTypes}
                onChange={setFilterPdvTypes}
                placeholder="Tous les types"
              />
              <MultiSelect
                label="Filtrer par article"
                options={articleOptionsBar}
                selected={filterArticles}
                onChange={setFilterArticles}
                placeholder="Tous les articles bars"
              />
            </div>

            {/* CA horaire + familles */}
            <div className="grid xl:grid-cols-2 gap-4">
              <SectionCard title="CA horaire — bars"
                subtitle={livePic ? `Pic à ${livePic.label} · ${fmt.currency(livePic.ca_ht)}` : 'Par heure'}>
                {filteredHoraire.length > 1 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={filteredHoraire}>
                      <defs>
                        <linearGradient id="gradHL" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}   />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1A2840" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: '#8B9BB4', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#8B9BB4', fontSize: 10 }} axisLine={false} tickLine={false}
                        tickFormatter={v => `${(v/1000).toFixed(0)}k`} width={32} />
                      <Tooltip content={<Tip />} />
                      <Area type="monotone" dataKey="ca_ht" name="CA HT" stroke="#F59E0B" strokeWidth={2}
                        fill="url(#gradHL)" dot={false} activeDot={{ r: 4, fill: '#F59E0B' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <NoDataSmall detail="Données horaires non disponibles pour cette sélection." />}
              </SectionCard>

              <SectionCard title="CA par famille" subtitle="Suivi live">
                {liveKpi.top_familles.length > 0 ? (
                  <div className="space-y-2 mt-1">
                    {liveKpi.top_familles.slice(0, 8).map((f, i) => (
                      <HBar key={f.name} label={f.name} value={f.ca}
                        max={liveKpi.top_familles[0].ca}
                        color={i === 0 ? '#F59E0B' : i < 3 ? '#068EEA' : '#2A3850'} />
                    ))}
                  </div>
                ) : <NoDataSmall detail="Aucune famille détectée." />}
              </SectionCard>
            </div>

            {/* Top articles bar + CA par type PDV */}
            <div className="grid xl:grid-cols-2 gap-4">
              <SectionCard title="Top articles — bars uniquement" subtitle="SUM quantité · type BAR">
                {filteredArticlesBar.length > 0 ? (
                  <div className="space-y-2 mt-1">
                    {filteredArticlesBar.map((a, i) => (
                      <div key={a.art} className="flex items-center gap-2.5">
                        {filterArticles.length === 0 && (
                          <span className="num text-2xs font-bold w-4 text-[#4A5568] flex-shrink-0">{i + 1}</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between mb-0.5">
                            <p className="text-xs text-[#8B9BB4] truncate pr-2">{a.art}</p>
                            <p className="num text-xs font-semibold text-white flex-shrink-0">{fmt.number(a.qty)}</p>
                          </div>
                          <div className="h-1.5 rounded-full" style={{ background: '#1A2840' }}>
                            <div className="h-full rounded-full" style={{
                              width: `${(a.qty / (liveKpi.top_articles_bar[0]?.qty || 1)) * 100}%`,
                              background: i === 0 && filterArticles.length === 0 ? '#F59E0B' : '#068EEA'
                            }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <NoDataSmall detail="Aucun article BAR correspondant au filtre actif." />}
              </SectionCard>

              <SectionCard title="CA par type PDV" subtitle="BAR · FOOD · MERCH">
                {filteredPdvType.length > 0 ? (
                  <div className="space-y-3 mt-1">
                    {filteredPdvType.map((t, i) => {
                      const total = filteredPdvType.reduce((s, x) => s + x.ca, 0)
                      const pct = total > 0 ? Math.round((t.ca / total) * 100) : 0
                      return (
                        <div key={t.type}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                                style={{ background: PDV_COLORS[i] ?? '#4A5568' }} />
                              <p className="text-xs font-semibold text-white">{t.type}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="num text-xs font-semibold text-white">{fmt.currency(t.ca)}</p>
                              <p className="num text-2xs text-[#4A5568] w-8 text-right">{pct}%</p>
                            </div>
                          </div>
                          <div className="h-2 rounded-full" style={{ background: '#1A2840' }}>
                            <div className="h-full rounded-full"
                              style={{ width: `${pct}%`, background: PDV_COLORS[i] ?? '#4A5568' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : <NoDataSmall detail="Colonne 'Type de point de vente' absente." />}
              </SectionCard>
            </div>

            {/* Tableaux acheteurs */}
            <div className="grid xl:grid-cols-2 gap-4">
              <SectionCard title="Top 10 acheteurs — par CA" subtitle="Total CA HT dépensé">
                <AcheteurList
                  rows={liveKpi.top_acheteurs_ca}
                  valueKey="ca"
                  valueFmt={v => fmt.currency(v)}
                />
              </SectionCard>
              <SectionCard title="Top 10 acheteurs — par fréquence" subtitle="Nombre de transactions">
                <AcheteurList
                  rows={liveKpi.top_acheteurs_nb}
                  valueKey="nb"
                  valueFmt={v => `${fmt.number(v)} trans.`}
                />
              </SectionCard>
            </div>
          </>)}
        </div>
      )}

    </div>
  )
}
