import { useState, useEffect } from 'react'
import {
  Settings2, Sparkles, Key, Monitor, Info, CheckCircle, AlertCircle,
  Save, Package, Calculator, Lock, ChevronDown, ChevronUp, Euro, Users
} from 'lucide-react'
import SectionCard from '../components/ui/SectionCard'
import { useEdition } from '../context/EditionContext'
import { API } from '../lib/api'
import { fmt } from '../lib/format'

const LS_SETTINGS = 'ea_app_settings'

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(LS_SETTINGS) ?? '{}') } catch { return {} }
}
function saveSettings(data) {
  localStorage.setItem(LS_SETTINGS, JSON.stringify(data))
}

// ── Calculateur de tarification ───────────────────────────────────────────────
function PricingCalculator() {
  const [mode, setMode]             = useState('simple')   // 'simple' | 'multi'
  const [participants, setParticipants] = useState('')
  const [selectedPack, setSelectedPack] = useState('starter')
  const [result, setResult]         = useState(null)
  const [loading, setLoading]       = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  // Multi-éditions
  const [editions, setEditions] = useState([{ name: 'Édition 1', participants: '' }])

  function addEdition()         { setEditions(e => [...e, { name: `Édition ${e.length + 1}`, participants: '' }]) }
  function removeEdition(i)     { setEditions(e => e.filter((_, j) => j !== i)) }
  function updateEdition(i, k, v) { setEditions(e => e.map((ed, j) => j === i ? { ...ed, [k]: v } : ed)) }

  async function calculate() {
    setLoading(true); setResult(null)
    try {
      if (mode === 'simple') {
        const nb = parseInt(participants)
        if (!nb || nb <= 0) { setLoading(false); return }
        const res = await fetch(`${API}/api/pricing/calculate?participants=${nb}&pack=${selectedPack}`)
        if (res.ok) setResult(await res.json())
      } else {
        const eds = editions
          .filter(e => parseInt(e.participants) > 0)
          .map(e => ({ name: e.name, expected_participants: parseInt(e.participants) }))
        if (!eds.length) { setLoading(false); return }
        const res = await fetch(`${API}/api/pricing/calculate-plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan_type: selectedPack, editions: eds }),
        })
        if (res.ok) {
          const data = await res.json()
          // Adapter format multi pour l'affichage unifié
          const mini = data.minimum
          setResult({
            pack: selectedPack,
            pack_label: data.plan_type,
            nb_participants: eds.reduce((s, e) => s + (e.expected_participants || 0), 0),
            price_calculated: data.total_calculated,
            price_minimum: mini,
            price_final: data.price_final,
            price_basis: data.price_basis,
            detail_tranches: data.per_edition?.map(e => ({
              label: e.name,
              nb: e.participants,
              rate: null,
              amount: e.price_calc,
            })) ?? [],
            is_multi: true,
          })
        }
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  const PACK_OPTS = [
    { id: 'pilote',  label: 'Pack Pilote',  min: '1 500 €' },
    { id: 'starter', label: 'Pack Starter', min: '2 500 €' },
    { id: 'saison',  label: 'Pack Saison',  min: '5 000 €' },
    { id: 'premium', label: 'Pack Premium', min: '9 000 €' },
  ]

  return (
    <div className="space-y-4">
      {/* Mode + Pack */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: '#8B9BB4' }}>Mode de calcul</label>
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#080E1E', border: '1px solid #1A2840' }}>
            {[{ id: 'simple', label: '1 édition' }, { id: 'multi', label: 'Multi-éditions' }].map(m => (
              <button key={m.id} onClick={() => { setMode(m.id); setResult(null) }}
                className="flex-1 py-1.5 rounded text-xs font-semibold transition"
                style={mode === m.id
                  ? { background: 'rgba(99,102,241,0.2)', color: '#A5B4FC' }
                  : { color: '#8B9BB4' }}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: '#8B9BB4' }}>Pack</label>
          <select
            className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
            style={{ background: '#080E1E', border: '1px solid #1A2840', colorScheme: 'dark' }}
            value={selectedPack}
            onChange={e => { setSelectedPack(e.target.value); setResult(null) }}>
            {PACK_OPTS.map(p => (
              <option key={p.id} value={p.id}>{p.label} (min. {p.min})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mode simple : 1 champ participants */}
      {mode === 'simple' && (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: '#8B9BB4' }}>Participants</label>
          <input
            type="number"
            className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
            style={{ background: '#080E1E', border: '1px solid #1A2840' }}
            placeholder="Ex : 15 000"
            value={participants}
            onChange={e => { setParticipants(e.target.value); setResult(null) }}
            onFocus={e => e.target.style.borderColor = '#6366F1'}
            onBlur={e  => e.target.style.borderColor = '#1A2840'}
          />
        </div>
      )}

      {/* Mode multi : une ligne par édition */}
      {mode === 'multi' && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#8B9BB4' }}>
            Éditions et participants attendus
          </p>
          {editions.map((ed, i) => (
            <div key={i} className="grid grid-cols-5 gap-2 items-center">
              <input
                className="col-span-2 px-2.5 py-2 rounded-lg text-xs text-white outline-none"
                style={{ background: '#080E1E', border: '1px solid #1A2840' }}
                placeholder="Nom édition"
                value={ed.name}
                onChange={e => updateEdition(i, 'name', e.target.value)}
              />
              <input
                type="number"
                className="col-span-2 px-2.5 py-2 rounded-lg text-xs text-white outline-none"
                style={{ background: '#080E1E', border: '1px solid #1A2840' }}
                placeholder="Participants"
                value={ed.participants}
                onChange={e => { updateEdition(i, 'participants', e.target.value); setResult(null) }}
              />
              <button onClick={() => removeEdition(i)} disabled={editions.length === 1}
                className="py-2 rounded-lg text-xs text-[#4A5568] hover:text-[#EF4444] transition disabled:opacity-30">
                ✕
              </button>
            </div>
          ))}
          <button onClick={addEdition}
            className="text-xs text-[#068EEA] hover:text-[#21AAFA] transition">
            + Ajouter une édition
          </button>
        </div>
      )}

      <button
        onClick={calculate}
        disabled={loading || !participants}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
        style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.35)', color: '#A5B4FC' }}>
        <Calculator size={14} strokeWidth={2} />
        {loading ? 'Calcul…' : 'Calculer le prix indicatif'}
      </button>

      {result && (
        <div className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.05)' }}>

          {/* Résultat principal */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-[#8B9BB4]">{result.pack_label}</p>
                <p className="text-xs text-[#8B9BB4] mt-0.5">
                  {fmt.number(result.nb_participants)} participants
                </p>
              </div>
              <div className="text-right">
                <p className="num text-2xl font-bold text-white">
                  {result.price_final.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} € HT
                </p>
                <p className="text-xs mt-0.5"
                  style={{ color: result.price_basis === 'minimum' ? '#F59E0B' : '#10B981' }}>
                  {result.price_basis === 'minimum'
                    ? '★ Minimum commercial appliqué'
                    : '↗ Calcul progressif par tranche'}
                </p>
              </div>
            </div>

            {/* Barres comparaison */}
            {result.price_basis === 'minimum' && (
              <div className="mt-3 p-3 rounded-xl text-xs"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <p className="text-[#8B9BB4]">
                  Prix calculé ({result.price_calculated.toLocaleString('fr-FR')} € HT) inférieur
                  au minimum du pack ({result.price_minimum.toLocaleString('fr-FR')} € HT).
                  <span className="text-[#F59E0B] font-semibold"> Le minimum s'applique.</span>
                </p>
              </div>
            )}
          </div>

          {/* Détail — toggle */}
          {result.detail_tranches?.length > 0 && (
            <div style={{ borderTop: '1px solid rgba(99,102,241,0.2)' }}>
              <button
                onClick={() => setDetailOpen(!detailOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-xs hover:bg-white/[0.03] transition"
                style={{ color: '#8B9BB4' }}>
                <span>{result.is_multi ? 'Détail par édition' : 'Détail par tranche'}</span>
                {detailOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              {detailOpen && (
                <div className="px-4 pb-4 space-y-2">
                  <div className="grid grid-cols-4 gap-2 pb-1"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {(result.is_multi
                      ? ['Édition', 'Participants', '', 'Montant']
                      : ['Tranche', 'Participants', 'Taux', 'Montant']
                    ).map(h => (
                      <p key={h} className="text-xs font-semibold uppercase tracking-wider"
                        style={{ color: '#4A5568', fontSize: '0.6rem' }}>{h}</p>
                    ))}
                  </div>
                  {result.detail_tranches.map((t, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2">
                      <p className="text-xs text-[#8B9BB4]">{t.label}</p>
                      <p className="num text-xs text-white">{fmt.number(t.nb)}</p>
                      <p className="num text-xs text-[#8B9BB4]">{t.rate ? `${t.rate.toFixed(2)} €` : '—'}</p>
                      <p className="num text-xs font-semibold text-white">{fmt.currency(t.amount)}</p>
                    </div>
                  ))}
                  <div className="grid grid-cols-4 gap-2 pt-1"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="col-span-3 text-xs font-bold text-white">Sous-total calculé</p>
                    <p className="num text-xs font-bold text-white">{fmt.currency(result.price_calculated)}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <p className="col-span-3 text-xs text-[#4A5568]">Minimum commercial ({result.pack_label})</p>
                    <p className="num text-xs text-[#4A5568]">{fmt.currency(result.price_minimum)}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2 pt-1 rounded-lg px-2 py-1.5"
                    style={{ background: 'rgba(99,102,241,0.1)' }}>
                    <p className="col-span-3 text-xs font-bold text-white">Prix final HT</p>
                    <p className="num text-xs font-bold text-[#A5B4FC]">{fmt.currency(result.price_final)}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Rappel barème */}
      <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1A2840' }}>
        <p className="text-xs font-semibold text-white mb-2">Barème progressif</p>
        <div className="space-y-1">
          {[
            { tranche: '0 – 2 000 participants',    rate: '1,00 € HT / participant' },
            { tranche: '2 001 – 5 000 participants', rate: '0,75 € HT / participant' },
            { tranche: '5 001 participants et +',    rate: '0,50 € HT / participant' },
          ].map(r => (
            <div key={r.tranche} className="flex items-center justify-between">
              <p className="text-xs text-[#8B9BB4]">{r.tranche}</p>
              <p className="num text-xs text-white font-medium">{r.rate}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Quota bar ─────────────────────────────────────────────────────────────────
function QuotaBar({ label, used, total, color }) {
  const unlimited = total === null || total === undefined
  const pct = unlimited ? 0 : total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
  const remaining = unlimited ? null : Math.max(0, total - used)
  const warning = !unlimited && pct >= 80

  return (
    <div className="p-3 rounded-xl" style={{ background: '#080E1E', border: `1px solid ${warning ? 'rgba(239,68,68,0.3)' : '#1A2840'}` }}>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-semibold text-white">{label}</p>
        <p className="num text-xs" style={{ color: warning ? '#EF4444' : '#8B9BB4' }}>
          {unlimited ? 'Illimité' : `${used} / ${total}`}
        </p>
      </div>
      {!unlimited && (
        <div className="h-1.5 rounded-full" style={{ background: '#1A2840' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: warning ? '#EF4444' : color }} />
        </div>
      )}
      {!unlimited && (
        <p className="text-xs mt-1" style={{ color: warning ? '#EF4444' : '#4A5568' }}>
          {remaining === 0 ? '⚠ Quota atteint' : `${remaining} restant${remaining > 1 ? 's' : ''}`}
        </p>
      )}
    </div>
  )
}

// ── Bloc Pack actuel ──────────────────────────────────────────────────────────
function PackCard({ pack }) {
  if (!pack) return null

  const COLORS = ['#F59E0B', '#068EEA', '#10B981', '#6366F1']
  const modules = pack.enabled_modules === 'all'
    ? ['Tous les modules']
    : (pack.enabled_modules ?? []).map(m => m.replace(/_/g, ' '))
  const locked  = pack.locked_modules ?? []
  const reports = pack.enabled_reports === 'all' ? ['Tous (9 types)'] : (pack.enabled_reports ?? [])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}>
              {pack.label}
            </span>
            {pack.on_quote && (
              <span className="px-2 py-0.5 rounded-full text-xs"
                style={{ background: 'rgba(99,102,241,0.1)', color: '#A5B4FC' }}>Sur devis</span>
            )}
          </div>
          <p className="text-xs text-[#8B9BB4]">{pack.tagline}</p>
        </div>
        <p className="num text-sm font-bold flex-shrink-0" style={{ color: '#F59E0B' }}>
          {(pack.minimum_price ?? 0).toLocaleString('fr-FR')} € HT min
        </p>
      </div>

      {/* Quotas avec usage */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
        <QuotaBar label="Événements"   used={pack.used_events ?? 0}          total={pack.included_events}          color={COLORS[0]} />
        <QuotaBar label="Éditions"     used={pack.used_active_editions ?? 0}  total={pack.included_active_editions}  color={COLORS[1]} />
        <QuotaBar label="Rapports IA"  used={pack.used_ai_reports ?? 0}       total={pack.included_ai_reports}       color={COLORS[2]} />
      </div>

      {/* Modules inclus / verrouillés */}
      <div className="grid xl:grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: '#8B9BB4', fontSize: '0.6rem' }}>Modules inclus</p>
          <div className="flex flex-wrap gap-1.5">
            {modules.map(m => (
              <span key={m} className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
                style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}>
                {m}
              </span>
            ))}
          </div>
        </div>
        {locked.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: '#8B9BB4', fontSize: '0.6rem' }}>Modules verrouillés</p>
            <div className="flex flex-wrap gap-1.5">
              {locked.map(m => (
                <span key={m} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs capitalize"
                  style={{ background: 'rgba(74,85,104,0.15)', color: '#4A5568', border: '1px solid #1A2840' }}>
                  <Lock size={9} strokeWidth={2} />{m.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Rapports IA inclus */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: '#8B9BB4', fontSize: '0.6rem' }}>Rapports IA inclus</p>
        <div className="flex flex-wrap gap-1.5">
          {reports.map(r => (
            <span key={r} className="px-2 py-0.5 rounded-full text-xs"
              style={{ background: 'rgba(99,102,241,0.1)', color: '#A5B4FC', border: '1px solid rgba(99,102,241,0.2)' }}>
              {r.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>

      {/* Fonctionnalités */}
      {pack.features?.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: '#8B9BB4', fontSize: '0.6rem' }}>Inclus dans ce pack</p>
          <div className="grid xl:grid-cols-2 gap-1.5">
            {pack.features.map(f => (
              <div key={f} className="flex items-start gap-2">
                <CheckCircle size={12} className="flex-shrink-0 mt-0.5" style={{ color: '#10B981' }} strokeWidth={2} />
                <p className="text-xs text-[#8B9BB4]">{f}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Infos statut */}
      <div className="grid grid-cols-2 gap-2 pt-1" style={{ borderTop: '1px solid #1A2840' }}>
        {[
          { label: 'Statut abonnement', val: pack.subscription_status ?? 'active' },
          { label: 'Statut paiement',   val: pack.payment_status ?? 'paid' },
        ].map(({ label, val }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: val === 'active' || val === 'paid' ? '#10B981' : '#EF4444' }} />
            <p className="text-xs text-[#8B9BB4]">{label}</p>
            <p className="text-xs font-semibold text-white ml-auto capitalize">{val}</p>
          </div>
        ))}
      </div>
    </div>
  )
}


// ── Page principale ───────────────────────────────────────────────────────────
export default function Settings() {
  const { activeEdition, activeEvent } = useEdition()
  const [settings,  setSettings]  = useState(loadSettings)
  const [saved,     setSaved]     = useState(false)
  const [apiStatus, setApiStatus] = useState(null)
  const [packData,  setPackData]  = useState(null)

  const set = k => v => setSettings(s => ({ ...s, [k]: v }))

  useEffect(() => {
    fetch(`${API}/api/pack`)
      .then(r => r.ok ? r.json() : null)
      .then(setPackData)
      .catch(() => null)
  }, [])

  function handleSave() {
    saveSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function testApiConnection() {
    try {
      const res = await fetch(`${API}/health`)
      setApiStatus(res.ok ? 'ok' : 'error')
    } catch {
      setApiStatus('error')
    }
    setTimeout(() => setApiStatus(null), 4000)
  }

  return (
    <div className="space-y-6 animate-slide-up max-w-2xl">

      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#6366F1' }}>
          Configuration
        </p>
        <h2 className="text-lg font-bold text-white">Paramètres</h2>
        <p className="text-sm mt-1" style={{ color: '#8B9BB4' }}>
          Instance · Pack · Tarification indicative · Configuration système.
        </p>
      </div>

      {/* Édition active */}
      <div className="p-4 rounded-2xl flex items-start gap-3"
        style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)' }}>
        <Monitor size={16} style={{ color: '#A5B4FC' }} strokeWidth={1.8} className="mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-white">
            {activeEvent?.name ?? 'Aucun événement'} — {activeEdition?.name ?? 'Aucune édition active'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#8B9BB4' }}>
            ID édition : <code className="text-[#06B6D4]">{activeEdition?.id ?? '—'}</code>
          </p>
        </div>
      </div>

      {/* Pack actif */}
      <SectionCard
        title="Pack actif"
        subtitle={packData ? `${packData.label} — ${packData.duration_months} mois` : 'Chargement…'}
        action={
          packData && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }}>
              {packData.id?.toUpperCase()}
            </span>
          )
        }
      >
        {packData
          ? <PackCard pack={packData} />
          : <p className="text-xs text-[#4A5568]">Impossible de charger les informations du pack.</p>
        }
      </SectionCard>

      {/* Calculateur de tarification */}
      <SectionCard
        title="Calculateur de tarification"
        subtitle="Outil indicatif — aucun paiement déclenché. Activation manuelle par l'équipe."
        action={
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(16,185,129,0.08)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}>
            <Calculator size={10} />
            Indicatif HT
          </span>
        }
      >
        <PricingCalculator />
      </SectionCard>

      {/* Connexion backend */}
      <SectionCard
        title="Connexion backend"
        subtitle={`API : ${API}`}
        action={
          <button
            onClick={testApiConnection}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition hover:opacity-80"
            style={{ background: 'rgba(6,142,234,0.12)', color: '#21AAFA', border: '1px solid rgba(6,142,234,0.2)' }}>
            Tester la connexion
          </button>
        }
      >
        {apiStatus && (
          <div className="flex items-center gap-2 p-3 rounded-xl text-xs"
            style={{
              background: apiStatus === 'ok' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${apiStatus === 'ok' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
              color: apiStatus === 'ok' ? '#10B981' : '#FCA5A5',
            }}>
            {apiStatus === 'ok'
              ? <><CheckCircle size={13} strokeWidth={2} /> Backend accessible</>
              : <><AlertCircle size={13} strokeWidth={2} /> Backend non accessible</>
            }
          </div>
        )}
        <div className="mt-3 space-y-1">
          <p className="text-xs text-[#8B9BB4]">
            URL configurée via <code className="text-[#06B6D4]">VITE_API_URL</code>
          </p>
          <p className="text-xs text-[#4A5568]">
            Valeur actuelle : <span className="text-[#8B9BB4]">{API}</span>
          </p>
        </div>
      </SectionCard>

      {/* Clé IA */}
      <SectionCard
        title="Intelligence artificielle"
        subtitle="Clé API Anthropic — requise pour la génération de rapports IA"
        action={
          <span className="flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(99,102,241,0.12)', color: '#A5B4FC', border: '1px solid rgba(99,102,241,0.2)' }}>
            <Sparkles size={10} strokeWidth={2} />
            Claude Sonnet 4.6
          </span>
        }
      >
        <div className="flex items-start gap-2 p-3 rounded-xl"
          style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}>
          <Info size={13} className="mt-0.5 flex-shrink-0" style={{ color: '#06B6D4' }} strokeWidth={2} />
          <p className="text-xs" style={{ color: '#8B9BB4' }}>
            Clé configurée côté serveur dans <code className="text-[#06B6D4]">backend/.env</code> via{' '}
            <code className="text-[#06B6D4]">ANTHROPIC_API_KEY</code>. Non exposée côté client.
          </p>
        </div>
      </SectionCard>

      {/* Préférences */}
      <SectionCard title="Préférences" subtitle="Configuration locale de l'instance">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#8B9BB4' }}>
              Nom affiché dans les rapports PDF
            </label>
            <input
              className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none transition"
              style={{ background: '#080E1E', border: '1px solid #1A2840' }}
              placeholder="Ex: Festival Été, Gala Annual, Forum Tech…"
              value={settings.appName ?? ''}
              onChange={e => set('appName')(e.target.value)}
              onFocus={e => e.target.style.borderColor = '#6366F1'}
              onBlur={e  => e.target.style.borderColor = '#1A2840'}
            />
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: saved ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)', color: saved ? '#10B981' : '#A5B4FC', border: `1px solid ${saved ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'}` }}>
            {saved ? <><CheckCircle size={14} strokeWidth={2} /> Enregistré</> : <><Save size={14} strokeWidth={1.8} /> Enregistrer</>}
          </button>
        </div>
      </SectionCard>

      {/* Version */}
      <SectionCard title="Version" subtitle="Informations système">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Application', value: 'Event Analytics' },
            { label: 'Version',     value: 'v2.0 — Production' },
            { label: 'Frontend',    value: 'React 18 + Vite + Tailwind' },
            { label: 'Backend',     value: 'FastAPI + Python + SQLite' },
            { label: 'IA',          value: 'Claude Sonnet 4.6' },
            { label: 'Pack',        value: packData?.label ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1A2840' }}>
              <p className="text-2xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#4A5568', fontSize: '0.6rem' }}>{label}</p>
              <p className="text-xs font-medium text-white">{value}</p>
            </div>
          ))}
        </div>
      </SectionCard>

    </div>
  )
}
