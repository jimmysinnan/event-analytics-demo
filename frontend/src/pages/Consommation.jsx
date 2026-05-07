import { useState, useEffect, useRef, useCallback } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import {
  ShoppingCart, Euro, Users, Star, Info,
  RefreshCw, Upload, CheckCircle, AlertCircle
} from 'lucide-react'
import KpiCard     from '../components/ui/KpiCard'
import SectionCard from '../components/ui/SectionCard'
import EmptyState  from '../components/ui/EmptyState'
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

// ── Composants partagés ───────────────────────────────────────────────────────
function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2.5 text-xs" style={{ background: '#111D33', border: '1px solid #1A2840' }}>
      <p className="font-semibold text-[#8B9BB4] uppercase tracking-wider mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="num font-semibold" style={{ color: p.color || '#F0F4FF' }}>
          {p.name}: {typeof p.value === 'number' && p.dataKey !== 'qty' ? fmt.currency(p.value) : fmt.number(p.value)}
        </p>
      ))}
    </div>
  )
}

function NoDataSmall({ detail }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 gap-1.5"
      style={{ background: 'rgba(74,85,104,0.07)', borderRadius: '0.75rem', border: '1px dashed #1A2840' }}>
      <Info size={15} className="text-[#4A5568]" strokeWidth={1.5} />
      <p className="text-xs text-[#4A5568] text-center leading-snug">{detail}</p>
    </div>
  )
}

// ── Barre horizontale réutilisable ─────────────────────────────────────────────
function HBar({ label, value, max, color = '#068EEA', labelFmt = v => fmt.currency(v) }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <p className="text-xs text-[#8B9BB4] truncate pr-2">{label}</p>
        <p className="num text-xs font-semibold text-white flex-shrink-0">{labelFmt(value)}</p>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: '#1A2840' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ── Hook fetch summary ─────────────────────────────────────────────────────────
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

// ── Zone upload conso ─────────────────────────────────────────────────────────
function ConsoUpload({ editionId, onSuccess }) {
  const inputRef = useRef(null)
  const [status,  setStatus]  = useState('idle') // idle | loading | ok | error
  const [message, setMessage] = useState('')

  const handleFile = useCallback(async (file) => {
    if (!file) return
    setStatus('loading')
    setMessage('')
    const form = new FormData()
    form.append('file', file)
    let url = `${API}/api/upload/conso`
    if (editionId) url += `?edition_id=${encodeURIComponent(editionId)}`
    try {
      const res = await fetch(url, { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Erreur ${res.status}`)
      }
      const result = await res.json()
      setStatus('ok')
      setMessage(`Import réussi · ${fmt.currency(result.kpi?.ca_ht ?? 0)} CA HT`)
      onSuccess?.()
    } catch (e) {
      setStatus('error')
      setMessage(e.message)
    }
  }, [editionId, onSuccess])

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#0D1526', border: '1px solid #1A2840' }}>
      <div
        className="flex flex-col items-center justify-center gap-3 py-6 cursor-pointer transition-colors hover:bg-[#111D33]"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
      >
        {status === 'loading' && <RefreshCw size={20} className="animate-spin text-[#068EEA]" />}
        {status === 'ok'      && <CheckCircle size={20} className="text-[#10B981]" />}
        {status === 'error'   && <AlertCircle size={20} className="text-[#EF4444]" />}
        {status === 'idle'    && <Upload size={20} style={{ color: '#068EEA' }} strokeWidth={1.5} />}
        <div className="text-center">
          <p className="text-sm font-semibold text-white">
            {status === 'idle'    ? 'Importer / Actualiser le fichier conso' :
             status === 'loading' ? 'Analyse en cours…' :
             status === 'ok'      ? 'Import réussi' : 'Erreur'}
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

// ── Filtre article (recherche dans la liste) ───────────────────────────────────
function ArticleFilter({ articles, selected, onChange }) {
  if (!articles?.length) return null
  return (
    <div className="flex items-center gap-2 mb-3">
      <label className="text-xs font-semibold uppercase tracking-wider flex-shrink-0"
        style={{ color: '#4A5568', fontSize: '0.6rem' }}>Article</label>
      <select
        className="flex-1 px-2.5 py-1.5 rounded-lg text-xs text-white outline-none"
        style={{ background: '#080E1E', border: '1px solid #1A2840', colorScheme: 'dark' }}
        value={selected}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">Tous les articles</option>
        {articles.map(a => (
          <option key={a.art} value={a.art}>{a.art} ({fmt.number(a.qty)})</option>
        ))}
      </select>
    </div>
  )
}

// ── Filtre PDV horaire (bars uniquement) ──────────────────────────────────────
function PdvFilter({ names, selected, onChange }) {
  if (!names?.length) return null
  return (
    <div className="flex items-center gap-2 mb-3">
      <label className="text-xs font-semibold uppercase tracking-wider flex-shrink-0"
        style={{ color: '#4A5568', fontSize: '0.6rem' }}>PDV</label>
      <select
        className="flex-1 px-2.5 py-1.5 rounded-lg text-xs text-white outline-none"
        style={{ background: '#080E1E', border: '1px solid #1A2840', colorScheme: 'dark' }}
        value={selected}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">Total tous bars</option>
        {names.map(n => <option key={n} value={n}>{n}</option>)}
      </select>
    </div>
  )
}

// ── Tableau acheteurs ──────────────────────────────────────────────────────────
function AcheteurTable({ rows, valueKey, valueLabel, valueFmt }) {
  if (!rows?.length) return <NoDataSmall detail="Données acheteurs non disponibles (colonne 'ID acheteur' absente)." />
  const hasNom    = rows.some(r => r.nom)
  const hasPrenom = rows.some(r => r.prenom)
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #1A2840' }}>
            <th className="text-left py-1.5 pr-3 font-semibold uppercase tracking-wider"
              style={{ color: '#4A5568', fontSize: '0.6rem', width: '1.5rem' }}>#</th>
            {hasNom    && <th className="text-left py-1.5 pr-3 font-semibold uppercase tracking-wider" style={{ color: '#4A5568', fontSize: '0.6rem' }}>Nom</th>}
            {hasPrenom && <th className="text-left py-1.5 pr-3 font-semibold uppercase tracking-wider" style={{ color: '#4A5568', fontSize: '0.6rem' }}>Prénom</th>}
            <th className="text-left py-1.5 pr-3 font-semibold uppercase tracking-wider"
              style={{ color: '#4A5568', fontSize: '0.6rem' }}>ID</th>
            <th className="text-right py-1.5 font-semibold uppercase tracking-wider"
              style={{ color: '#4A5568', fontSize: '0.6rem' }}>{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id + i} style={{ borderBottom: '1px solid #0D1526' }}
              className="hover:bg-[#0D1526] transition-colors">
              <td className="py-1.5 pr-3 num font-bold" style={{ color: '#4A5568' }}>{i + 1}</td>
              {hasNom    && <td className="py-1.5 pr-3 text-[#8B9BB4] truncate max-w-[80px]">{r.nom  || '—'}</td>}
              {hasPrenom && <td className="py-1.5 pr-3 text-[#8B9BB4] truncate max-w-[80px]">{r.prenom || '—'}</td>}
              <td className="py-1.5 pr-3 font-mono text-[#4A5568] truncate max-w-[80px]" title={r.id}>{r.id.slice(0, 10)}</td>
              <td className="py-1.5 num text-right font-semibold text-white">{valueFmt(r[valueKey])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────────────────────
export default function Consommation() {
  const { year, activeEdition } = useEdition()
  const [tab,          setTab]          = useState('analyse')
  const [uploadTrigger, setUploadTrigger] = useState(0)

  // Filtres
  const [filterArticle,    setFilterArticle]    = useState('')
  const [filterPdvHoraire, setFilterPdvHoraire] = useState('')

  // Demo data
  const d    = IS_DEMO ? CONSO[year]     : null
  const prev = IS_DEMO ? CONSO[year - 1] : null

  // Production data
  const { data: liveKpi, loading: liveLoading } = useLiveConso(activeEdition?.id, uploadTrigger)

  // KPI deltas (demo only)
  const delta_ca      = d && prev ? fmt.delta(d.ca,           prev.ca)           : null
  const delta_cli     = d && prev ? fmt.delta(d.clients,      prev.clients)      : null
  const delta_transac = d && prev ? fmt.delta(d.transactions, prev.transactions) : null
  const delta_panier  = d && prev ? fmt.delta(d.panier,       prev.panier)       : null

  const demoPic = CA_HORAIRE_2025.reduce((a, b) => b.ca_ht > a.ca_ht ? b : a)
  const livePic = liveKpi?.ca_horaire?.length
    ? liveKpi.ca_horaire.reduce((a, b) => b.ca_ht > a.ca_ht ? b : a)
    : null

  return (
    <div className="space-y-5 animate-slide-up">

      {/* Bandeau + tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Bandeau source */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
          style={{ background: 'rgba(6,142,234,0.07)', border: '1px solid rgba(6,142,234,0.15)', flex: '1 1 auto' }}>
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#068EEA' }} />
          <p className="text-xs text-[#8B9BB4] truncate">
            <span className="text-white font-semibold">{activeEdition?.name ?? year}</span>
            {IS_DEMO && d ? ` — Source : ${d.plateforme}` : ''}
            {!IS_DEMO && liveKpi ? ` — ${liveKpi.filename || 'Fichier importé'}` : ''}
            {!IS_DEMO && !liveKpi && !liveLoading ? ' — Aucun fichier consommation importé' : ''}
          </p>
          {liveLoading && <RefreshCw size={12} className="animate-spin text-[#4A5568] flex-shrink-0" />}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl flex-shrink-0"
          style={{ background: '#0D1526', border: '1px solid #1A2840' }}>
          {[
            { id: 'analyse', label: `Analyse ${year}` },
            { id: 'live',    label: 'Suivi live' },
          ].map(t => (
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

      {/* KPI cards — toujours visibles */}
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
      {tab === 'analyse' && (
        <>
          {/* Production: aucun import */}
          {!IS_DEMO && !liveKpi && !liveLoading && (
            <EmptyState
              message="Aucune donnée de consommation importée"
              hint="Importez un fichier Weezpay (onglet BDD ou JDD Vente) depuis la page Importer données."
            />
          )}

          {/* Production: données disponibles */}
          {!IS_DEMO && liveKpi && (<>
            {/* Ligne 1 : CA horaire bars + CA par type PDV */}
            <div className="grid xl:grid-cols-2 gap-4">
              <SectionCard title="CA horaire — bars uniquement"
                subtitle={livePic ? `Pic à ${livePic.label} · ${fmt.currency(livePic.ca_ht)}` : 'CA par heure'}>
                {liveKpi.ca_horaire.length > 1 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={liveKpi.ca_horaire}>
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
                ) : <NoDataSmall detail="Aucune donnée horaire dans ce fichier (colonne 'Heure transaction' absente ou aucun PDV de type BAR)." />}
              </SectionCard>

              <SectionCard title="CA par type de point de vente"
                subtitle="BAR · FOOD · MERCH · ...">
                {liveKpi.top_pdv_type.length > 0 ? (
                  <div className="space-y-2.5 mt-1">
                    {liveKpi.top_pdv_type.map((t, i) => (
                      <HBar key={t.type} label={t.type} value={t.ca}
                        max={liveKpi.top_pdv_type[0].ca}
                        color={i === 0 ? '#F59E0B' : i === 1 ? '#068EEA' : i === 2 ? '#10B981' : '#2A3850'} />
                    ))}
                  </div>
                ) : <NoDataSmall detail="Colonne 'Type de point de vente' absente dans ce fichier." />}
              </SectionCard>
            </div>

            {/* Ligne 2 : CA par famille + Top articles */}
            <div className="grid xl:grid-cols-2 gap-4">
              <SectionCard title="CA par famille d'articles"
                subtitle="Depuis import consommation">
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

              <SectionCard title={`Top articles — volume ${year}`}
                subtitle="SUM quantité par article">
                {liveKpi.top_articles.length > 0 ? (() => {
                  const filtered = filterArticle
                    ? liveKpi.top_articles.filter(a => a.art === filterArticle)
                    : liveKpi.top_articles.slice(0, 15)
                  const maxQty = liveKpi.top_articles[0]?.qty || 1
                  return (
                    <>
                      <ArticleFilter
                        articles={liveKpi.top_articles}
                        selected={filterArticle}
                        onChange={setFilterArticle}
                      />
                      <div className="space-y-2">
                        {filtered.map((a, i) => (
                          <div key={a.art} className="flex items-center gap-2.5">
                            <span className="num text-2xs font-bold w-4 text-[#4A5568] flex-shrink-0">
                              {filterArticle ? '—' : i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between mb-0.5">
                                <p className="text-xs text-[#8B9BB4] truncate pr-2">{a.art}</p>
                                <p className="num text-xs font-semibold text-white flex-shrink-0">{fmt.number(a.qty)}</p>
                              </div>
                              <div className="h-1.5 rounded-full" style={{ background: '#1A2840' }}>
                                <div className="h-full rounded-full" style={{
                                  width: `${(a.qty / maxQty) * 100}%`,
                                  background: i === 0 && !filterArticle ? '#F59E0B' : '#068EEA'
                                }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )
                })() : <NoDataSmall detail="Colonne 'Article' absente dans ce fichier." />}
              </SectionCard>
            </div>

            {/* Ligne 3 : CA par PDV nom */}
            {liveKpi.top_pdv_name.length > 0 && (
              <SectionCard title="CA par point de vente (détail)"
                subtitle="SUM CA HT par nom de point de vente">
                <div className="grid xl:grid-cols-2 gap-x-8 gap-y-2 mt-1">
                  {liveKpi.top_pdv_name.slice(0, 12).map((p, i) => (
                    <HBar key={p.pdv} label={p.pdv} value={p.ca}
                      max={liveKpi.top_pdv_name[0].ca}
                      color={i === 0 ? '#F59E0B' : '#068EEA'} />
                  ))}
                </div>
              </SectionCard>
            )}
          </>)}

          {/* Demo : sections existantes */}
          {IS_DEMO && (<>
            <div className="grid xl:grid-cols-3 gap-4">
              <SectionCard title="CA horaire bars"
                subtitle={year === 2025 ? `Pic à ${demoPic.label} · ${fmt.currency(demoPic.ca_ht)}` : 'Disponible uniquement pour 2025'}>
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

              <SectionCard title={`CA par point de vente — ${year}`}
                subtitle="Top zones · hors frais" className="xl:col-span-2">
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
                    const getCA = (yr, name) => CONSO[yr]?.familles?.find(f => f.name === name)?.ca ?? 0
                    const getColor = name =>
                      CONSO[2025]?.familles?.find(f => f.name === name)?.color ??
                      CONSO[2024]?.familles?.find(f => f.name === name)?.color ?? '#4A5568'
                    return allNames.slice(0, 7).map(name => {
                      const c23 = getCA(2023, name), c24 = getCA(2024, name), c25 = getCA(2025, name)
                      const max = Math.max(c23, c24, c25)
                      if (max === 0) return null
                      return (
                        <div key={name}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getColor(name) }} />
                              <p className="text-xs font-medium text-[#8B9BB4]">{name}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              {[{y:2023,v:c23,c:'#4A5568'},{y:2024,v:c24,c:'#068EEA'},{y:2025,v:c25,c:getColor(name)}].map(({y,v,c}) => (
                                <p key={y} className="num text-2xs font-semibold w-16 text-right"
                                  style={{ color: y === year ? '#F0F4FF' : c }}>{v ? fmt.currency(v) : '—'}</p>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            {[{v:c23,c:'#4A5568'},{v:c24,c:'#068EEA'},{v:c25,c:getColor(name)}].map(({v,c}, i) => (
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
                <div className="flex gap-4 pt-2 text-2xs text-[#4A5568]">
                  {[{y:'2023',c:'#4A5568'},{y:'2024',c:'#068EEA'},{y:'2025',c:'#F59E0B'}].map(({y,c}) => (
                    <span key={y} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: c }} />{y}
                    </span>
                  ))}
                </div>
              </SectionCard>

              <div className="space-y-4">
                <SectionCard title={`Top articles — volume ${year}`}>
                  {year === 2025 ? (
                    <div className="space-y-2 mt-1">
                      {TOP_ARTICLES_2025.map(({ art, qty }, i) => (
                        <div key={art} className="flex items-center gap-3">
                          <span className="num text-2xs font-bold w-4 text-[#4A5568]">{i + 1}</span>
                          <div className="flex-1">
                            <div className="flex justify-between mb-0.5">
                              <p className="text-xs text-[#8B9BB4] truncate pr-2">{art}</p>
                              <p className="num text-xs font-semibold text-white">{fmt.number(qty)}</p>
                            </div>
                            <div className="h-1.5 rounded-full" style={{ background: '#1A2840' }}>
                              <div className="h-full rounded-full"
                                style={{ width: `${(qty / TOP_ARTICLES_2025[0].qty) * 100}%`, background: i === 0 ? '#F59E0B' : '#068EEA' }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <NoDataSmall detail="Détail articles disponible uniquement pour 2025" />}
                </SectionCard>

                <SectionCard title="Évolution globale 2023 → 2025">
                  <div className="grid grid-cols-3 gap-3 mt-1">
                    {OVERVIEW.filter(o => o.ca_conso).map(o => (
                      <div key={o.year} className="text-center p-3 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${o.year === year ? 'rgba(245,158,11,0.2)' : '#1A2840'}` }}>
                        <p className="text-2xs uppercase tracking-wider mb-1.5"
                          style={{ color: o.year === year ? '#F59E0B' : o.year === 2024 ? '#068EEA' : '#4A5568' }}>
                          {o.year}{o.year === year && ' ✦'}
                        </p>
                        <p className="num text-sm font-bold text-white">{fmt.currency(o.ca_conso)}</p>
                        <div className="mt-2 space-y-0.5">
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
        </>
      )}

      {/* ══ Onglet Suivi live ════════════════════════════════════════════════════ */}
      {tab === 'live' && (
        <div className="space-y-4">

          {/* Zone d'upload pour actualisation */}
          <ConsoUpload
            editionId={activeEdition?.id}
            onSuccess={() => setUploadTrigger(t => t + 1)}
          />

          {!liveKpi && !liveLoading && (
            <EmptyState
              message="Aucune donnée de consommation importée"
              hint="Utilisez la zone ci-dessus pour importer votre fichier Weezpay et démarrer le suivi live."
            />
          )}

          {liveKpi && (<>
            {/* Ligne 1 : CA horaire + familles */}
            <div className="grid xl:grid-cols-2 gap-4">
              {(() => {
                // Données horaire : total BAR ou PDV spécifique
                const horaireData = filterPdvHoraire && liveKpi.ca_horaire_by_pdv?.[filterPdvHoraire]
                  ? liveKpi.ca_horaire_by_pdv[filterPdvHoraire]
                  : liveKpi.ca_horaire
                const pic = horaireData?.length
                  ? horaireData.reduce((a, b) => b.ca_ht > a.ca_ht ? b : a)
                  : null
                return (
                  <SectionCard title="CA horaire — bars"
                    subtitle={pic ? `Pic à ${pic.label} · ${fmt.currency(pic.ca_ht)}` : 'Par heure'}>
                    <PdvFilter
                      names={liveKpi.bar_pdv_names ?? []}
                      selected={filterPdvHoraire}
                      onChange={setFilterPdvHoraire}
                    />
                    {horaireData?.length > 1 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={horaireData}>
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
                    ) : <NoDataSmall detail="Données horaires non disponibles pour ce PDV." />}
                  </SectionCard>
                )
              })()}

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

            {/* Ligne 2 : Top articles bar + Top articles global */}
            <div className="grid xl:grid-cols-2 gap-4">
              <SectionCard title="Top articles — bars uniquement" subtitle="SUM quantité · type BAR">
                {liveKpi.top_articles_bar.length > 0 ? (() => {
                  const filtered = filterArticle
                    ? liveKpi.top_articles_bar.filter(a => a.art === filterArticle)
                    : liveKpi.top_articles_bar.slice(0, 15)
                  const maxQty = liveKpi.top_articles_bar[0]?.qty || 1
                  return (
                    <>
                      <ArticleFilter
                        articles={liveKpi.top_articles_bar}
                        selected={filterArticle}
                        onChange={setFilterArticle}
                      />
                      <div className="space-y-2">
                        {filtered.map((a, i) => (
                          <div key={a.art} className="flex items-center gap-2.5">
                            <span className="num text-2xs font-bold w-4 text-[#4A5568] flex-shrink-0">
                              {filterArticle ? '—' : i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between mb-0.5">
                                <p className="text-xs text-[#8B9BB4] truncate pr-2">{a.art}</p>
                                <p className="num text-xs font-semibold text-white flex-shrink-0">{fmt.number(a.qty)}</p>
                              </div>
                              <div className="h-1.5 rounded-full" style={{ background: '#1A2840' }}>
                                <div className="h-full rounded-full" style={{
                                  width: `${(a.qty / maxQty) * 100}%`,
                                  background: i === 0 && !filterArticle ? '#F59E0B' : '#068EEA'
                                }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )
                })() : <NoDataSmall detail="Aucun article BAR dans ce fichier." />}
              </SectionCard>

              <SectionCard title="CA par type PDV" subtitle="BAR · FOOD · MERCH">
                {liveKpi.top_pdv_type.length > 0 ? (
                  <div className="space-y-3 mt-1">
                    {liveKpi.top_pdv_type.map((t, i) => {
                      const total = liveKpi.top_pdv_type.reduce((s, x) => s + x.ca, 0)
                      const pct = total > 0 ? Math.round((t.ca / total) * 100) : 0
                      const colors = ['#F59E0B', '#068EEA', '#10B981', '#6366F1', '#EF4444']
                      return (
                        <div key={t.type}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                                style={{ background: colors[i] ?? '#4A5568' }} />
                              <p className="text-xs font-semibold text-white">{t.type}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="num text-xs font-semibold text-white">{fmt.currency(t.ca)}</p>
                              <p className="num text-2xs text-[#4A5568] w-8 text-right">{pct}%</p>
                            </div>
                          </div>
                          <div className="h-2 rounded-full" style={{ background: '#1A2840' }}>
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, background: colors[i] ?? '#4A5568' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : <NoDataSmall detail="Colonne 'Type de point de vente' absente." />}
              </SectionCard>
            </div>

            {/* Ligne 3 : Top acheteurs — tableaux avec nom + prénom */}
            <div className="grid xl:grid-cols-2 gap-4">
              <SectionCard title="Top 10 acheteurs — par CA" subtitle="Total CA HT dépensé">
                <AcheteurTable
                  rows={liveKpi.top_acheteurs_ca}
                  valueKey="ca"
                  valueLabel="CA HT"
                  valueFmt={v => fmt.currency(v)}
                />
              </SectionCard>
              <SectionCard title="Top 10 acheteurs — par fréquence" subtitle="Nombre de transactions">
                <AcheteurTable
                  rows={liveKpi.top_acheteurs_nb}
                  valueKey="nb"
                  valueLabel="Transactions"
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
