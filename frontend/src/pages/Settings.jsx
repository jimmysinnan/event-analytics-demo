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
  const [participants, setParticipants] = useState('')
  const [selectedPack, setSelectedPack] = useState('starter')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)

  async function calculate() {
    const nb = parseInt(participants)
    if (!nb || nb <= 0) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/pricing/calculate?participants=${nb}&pack=${selectedPack}`)
      if (res.ok) setResult(await res.json())
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
      {/* Inputs */}
      <div className="grid grid-cols-2 gap-3">
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

          {/* Détail tranches — toggle */}
          {result.detail_tranches?.length > 0 && (
            <div style={{ borderTop: '1px solid rgba(99,102,241,0.2)' }}>
              <button
                onClick={() => setDetailOpen(!detailOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-xs hover:bg-white/[0.03] transition"
                style={{ color: '#8B9BB4' }}>
                <span>Détail du calcul par tranche</span>
                {detailOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              {detailOpen && (
                <div className="px-4 pb-4 space-y-2">
                  <div className="grid grid-cols-4 gap-2 pb-1"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Tranche', 'Participants', 'Taux', 'Montant'].map(h => (
                      <p key={h} className="text-xs font-semibold uppercase tracking-wider"
                        style={{ color: '#4A5568', fontSize: '0.6rem' }}>{h}</p>
                    ))}
                  </div>
                  {result.detail_tranches.map((t, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2">
                      <p className="text-xs text-[#8B9BB4]">{t.label}</p>
                      <p className="num text-xs text-white">{fmt.number(t.nb)}</p>
                      <p className="num text-xs text-[#8B9BB4]">{t.rate.toFixed(2)} €</p>
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

// ── Bloc Pack actuel ──────────────────────────────────────────────────────────
function PackCard({ pack }) {
  if (!pack) return null

  const isUnlimited = v => v === null || v === undefined
  const quotaLabel  = (v, unit) => isUnlimited(v) ? 'Illimité' : `${v} ${unit}`

  const quota_color = '#21AAFA'
  const COLORS = ['#F59E0B', '#068EEA', '#10B981', '#6366F1']

  return (
    <div className="space-y-4">
      {/* Header pack */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}>
              {pack.label}
            </span>
            {pack.on_quote && (
              <span className="px-2 py-0.5 rounded-full text-xs"
                style={{ background: 'rgba(99,102,241,0.1)', color: '#A5B4FC' }}>
                Sur devis
              </span>
            )}
          </div>
          <p className="text-xs text-[#8B9BB4]">{pack.tagline}</p>
        </div>
        <p className="num text-sm font-bold flex-shrink-0"
          style={{ color: '#F59E0B' }}>
          {pack.min_price_ht.toLocaleString('fr-FR')} € HT min
        </p>
      </div>

      {/* Quotas */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
        {[
          { label: 'Événements',  val: quotaLabel(pack.quota_events,   '')    },
          { label: 'Éditions',    val: quotaLabel(pack.quota_editions,  '')    },
          { label: 'Rapports IA', val: quotaLabel(pack.quota_ai_reports,'')    },
          { label: 'Utilisateurs',val: quotaLabel(pack.quota_users,    '')     },
        ].map((q, i) => (
          <div key={q.label} className="p-2.5 rounded-xl text-center"
            style={{ background: `${COLORS[i]}10`, border: `1px solid ${COLORS[i]}25` }}>
            <p className="num text-sm font-bold" style={{ color: COLORS[i] }}>{q.val}</p>
            <p className="text-xs mt-0.5" style={{ color: '#8B9BB4' }}>{q.label}</p>
          </div>
        ))}
      </div>

      {/* Modules inclus + verrouillés */}
      <div className="grid xl:grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: '#8B9BB4', fontSize: '0.6rem' }}>Modules inclus</p>
          <div className="flex flex-wrap gap-1.5">
            {(pack.modules === 'all' ? ['Tous'] : pack.modules).map(m => (
              <span key={m} className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
                style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}>
                {m.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
        {pack.modules_locked?.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: '#8B9BB4', fontSize: '0.6rem' }}>Modules verrouillés</p>
            <div className="flex flex-wrap gap-1.5">
              {pack.modules_locked.map(m => (
                <span key={m} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs capitalize"
                  style={{ background: 'rgba(74,85,104,0.15)', color: '#4A5568', border: '1px solid #1A2840' }}>
                  <Lock size={9} strokeWidth={2} />
                  {m.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fonctionnalités incluses */}
      {pack.features?.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: '#8B9BB4', fontSize: '0.6rem' }}>Ce qui est inclus</p>
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

      {/* Non inclus */}
      {pack.not_included?.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: '#8B9BB4', fontSize: '0.6rem' }}>Non inclus dans ce pack</p>
          <div className="flex flex-wrap gap-1.5">
            {pack.not_included.map(f => (
              <span key={f} className="px-2 py-0.5 rounded-full text-xs"
                style={{ background: 'rgba(239,68,68,0.07)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.15)' }}>
                — {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Extensions disponibles */}
      {pack.extensions_resolved?.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: '#8B9BB4', fontSize: '0.6rem' }}>Extensions disponibles (à la carte)</p>
          <div className="grid xl:grid-cols-2 gap-2">
            {pack.extensions_resolved.map(ext => (
              <div key={ext.label} className="flex items-center justify-between p-2.5 rounded-xl"
                style={{ background: 'rgba(6,142,234,0.05)', border: '1px solid rgba(6,142,234,0.15)' }}>
                <p className="text-xs text-[#8B9BB4]">{ext.label}</p>
                <p className="num text-xs font-semibold text-white flex-shrink-0 ml-2">
                  {ext.price_ht ? `${ext.price_ht} € HT` : ext.price_pct ? `+${ext.price_pct}%` : '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
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
