/**
 * AdminConsole — Console opérateur Event Analytics
 *
 * URL : /admin
 * Accès : clé ADMIN_KEY uniquement (saisie à la première ouverture)
 * Invisible dans la navigation client — jamais référencé dans le sidebar.
 *
 * Fonctionnalités :
 *   - Authentification par clé admin
 *   - Lecture / mise à jour de la configuration client (plan, statut, usage)
 *   - Calculateur de tarification (1 édition ou multi-éditions)
 *   - Réinitialisation des compteurs d'usage
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Shield, Settings2, Calculator, ChevronDown, ChevronUp,
  CheckCircle, AlertCircle, RefreshCw, Save, RotateCcw,
  LogOut, Package, Euro, Users, BarChart2, Clock
} from 'lucide-react'
import { fmt } from '../lib/format'
import { API } from '../lib/api'

const ADMIN_KEY_LS = 'ea_admin_key'

const PACKS = [
  { id: 'pilot',   label: 'Pack Pilote',  min: '1 500 €',  events: 1,  editions: 1,  reports: 3   },
  { id: 'starter', label: 'Pack Starter', min: '2 500 €',  events: 2,  editions: 2,  reports: 10  },
  { id: 'season',  label: 'Pack Saison',  min: '5 000 €',  events: 5,  editions: 5,  reports: 30  },
  { id: 'premium', label: 'Pack Premium', min: '9 000 €',  events: 10, editions: 10, reports: 100 },
]

const STATUSES = ['active', 'suspended', 'trial', 'expired']
const PAYMENT  = ['paid', 'pending', 'overdue', 'free']

// ── Petit utilitaire ──────────────────────────────────────────────────────────
function adminFetch(path, opts = {}, key) {
  return fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': key,
      ...(opts.headers ?? {}),
    },
  })
}

// ── Écran de connexion ────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [key,   setKey]   = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    if (!key.trim()) return
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/api/admin/auth`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ key }),
      })
      if (res.ok) {
        sessionStorage.setItem(ADMIN_KEY_LS, key)
        onLogin(key)
      } else {
        setError('Clé invalide. Vérifiez ADMIN_KEY dans le .env serveur.')
      }
    } catch {
      setError('Impossible de contacter le backend.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: '#05080F' }}>
      <div className="w-full max-w-sm p-8 rounded-2xl"
        style={{ background: '#0D1526', border: '1px solid #1A2840' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,0.15)' }}>
            <Shield size={20} style={{ color: '#A5B4FC' }} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-base font-bold text-white">Console Admin</p>
            <p className="text-xs text-[#8B9BB4]">Event Analytics — Opérateur</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: '#8B9BB4' }}>Clé d'accès admin</label>
            <input
              type="password"
              className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none"
              style={{ background: '#080E1E', border: `1px solid ${error ? '#EF4444' : '#1A2840'}` }}
              placeholder="ADMIN_KEY du .env serveur"
              value={key}
              onChange={e => { setKey(e.target.value); setError('') }}
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-xs"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle size={13} className="text-[#EF4444]" strokeWidth={2} />
              <p className="text-[#FCA5A5]">{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading || !key.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
            style={{ background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.4)' }}>
            {loading ? 'Vérification…' : 'Accéder à la console'}
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: '#4A5568' }}>
          Page non référencée — accès opérateur uniquement
        </p>
      </div>
    </div>
  )
}

// ── Bloc : Configuration client ───────────────────────────────────────────────
function ConfigBlock({ adminKey, onSaved }) {
  const [cfg,     setCfg]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState('')
  const [form,    setForm]    = useState({})

  const set = k => v => setForm(f => ({ ...f, [k]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetch('/api/admin/config', {}, adminKey)
      if (res.ok) {
        const d = await res.json()
        setCfg(d); setForm(d)
      }
    } catch { setError('Erreur de chargement.') }
    setLoading(false)
  }, [adminKey])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    setSaving(true); setError('')
    try {
      const res = await adminFetch('/api/admin/config', {
        method: 'PUT', body: JSON.stringify(form),
      }, adminKey)
      if (res.ok) {
        setSaved(true); setTimeout(() => setSaved(false), 3000)
        onSaved?.()
        await load()
      } else { setError('Erreur de sauvegarde.') }
    } catch { setError('Erreur réseau.') }
    setSaving(false)
  }

  async function handleReset(field) {
    if (!window.confirm(`Remettre à zéro le compteur "${field}" ?`)) return
    await adminFetch('/api/admin/usage/reset', {
      method: 'POST', body: JSON.stringify({ field }),
    }, adminKey)
    await load()
  }

  if (loading) return (
    <div className="flex items-center gap-2 py-8 justify-center">
      <RefreshCw size={14} className="animate-spin text-[#4A5568]" />
      <p className="text-xs text-[#4A5568]">Chargement de la configuration…</p>
    </div>
  )

  if (!cfg) return <p className="text-xs text-[#EF4444]">{error || 'Impossible de charger.'}</p>

  const COLORS = ['#F59E0B', '#068EEA', '#10B981']
  const usageFields = [
    { key: 'used_events',          label: 'Événements utilisés',    total: cfg.included_events },
    { key: 'used_active_editions', label: 'Éditions actives',       total: cfg.included_active_editions },
    { key: 'used_ai_reports',      label: 'Rapports IA utilisés',   total: cfg.included_ai_reports },
  ]

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-3 rounded-xl text-xs flex items-center gap-2"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={13} className="text-[#EF4444]" />
          <p className="text-[#FCA5A5]">{error}</p>
        </div>
      )}

      {/* Infos client */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: '#8B9BB4' }}>Nom client</label>
          <input className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
            style={{ background: '#080E1E', border: '1px solid #1A2840' }}
            value={form.client_name ?? ''}
            onChange={e => set('client_name')(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: '#8B9BB4' }}>Slug</label>
          <input className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
            style={{ background: '#080E1E', border: '1px solid #1A2840' }}
            value={form.client_slug ?? ''}
            onChange={e => set('client_slug')(e.target.value)} />
        </div>
      </div>

      {/* Pack + statuts */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: '#8B9BB4' }}>Pack</label>
          <select className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
            style={{ background: '#080E1E', border: '1px solid #1A2840', colorScheme: 'dark' }}
            value={form.plan_type ?? 'starter'}
            onChange={e => set('plan_type')(e.target.value)}>
            {PACKS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: '#8B9BB4' }}>Abonnement</label>
          <select className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
            style={{ background: '#080E1E', border: '1px solid #1A2840', colorScheme: 'dark' }}
            value={form.subscription_status ?? 'active'}
            onChange={e => set('subscription_status')(e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: '#8B9BB4' }}>Paiement</label>
          <select className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
            style={{ background: '#080E1E', border: '1px solid #1A2840', colorScheme: 'dark' }}
            value={form.payment_status ?? 'paid'}
            onChange={e => set('payment_status')(e.target.value)}>
            {PAYMENT.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Quotas inclus (lecture seule — dépend du pack) */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: '#4A5568' }}>Quotas inclus dans le pack sélectionné</p>
        <div className="grid grid-cols-3 gap-2">
          {PACKS.find(p => p.id === (form.plan_type ?? 'starter')) && (() => {
            const p = PACKS.find(pp => pp.id === (form.plan_type ?? 'starter'))
            return [
              { label: 'Événements',   val: p.events  },
              { label: 'Éditions',     val: p.editions },
              { label: 'Rapports IA',  val: p.reports  },
            ].map((q, i) => (
              <div key={q.label} className="p-2.5 rounded-xl text-center"
                style={{ background: `${COLORS[i]}10`, border: `1px solid ${COLORS[i]}25` }}>
                <p className="num text-lg font-bold" style={{ color: COLORS[i] }}>{q.val}</p>
                <p className="text-xs mt-0.5" style={{ color: '#8B9BB4' }}>{q.label}</p>
              </div>
            ))
          })()}
        </div>
      </div>

      {/* Usage actuel + reset */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: '#4A5568' }}>Usage actuel (compteurs)</p>
        <div className="space-y-2">
          {usageFields.map((f, i) => {
            const used  = (cfg)[f.key] ?? 0
            const total = f.total
            const pct   = total ? Math.min(100, Math.round((used / total) * 100)) : 0
            const warn  = total && pct >= 80
            return (
              <div key={f.key} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: '#080E1E', border: `1px solid ${warn ? 'rgba(239,68,68,0.3)' : '#1A2840'}` }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-[#8B9BB4]">{f.label}</p>
                    <p className="num text-xs font-semibold" style={{ color: warn ? '#EF4444' : '#F0F4FF' }}>
                      {used} / {total ?? '∞'}
                    </p>
                  </div>
                  {total && (
                    <div className="h-1.5 rounded-full" style={{ background: '#1A2840' }}>
                      <div className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: warn ? '#EF4444' : COLORS[i] }} />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleReset(f.key)}
                  title="Remettre à zéro"
                  className="flex-shrink-0 p-1.5 rounded-lg transition hover:bg-[#1A2840]"
                  style={{ color: '#4A5568' }}>
                  <RotateCcw size={12} strokeWidth={2} />
                </button>
              </div>
            )
          })}
          <button
            onClick={() => handleReset('all')}
            className="text-xs text-[#EF4444] hover:text-[#FCA5A5] transition">
            Remettre tous les compteurs à zéro
          </button>
        </div>
      </div>

      {/* Bouton sauvegarder */}
      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition hover:opacity-90 disabled:opacity-40"
        style={{
          background: saved ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)',
          color:      saved ? '#10B981' : '#A5B4FC',
          border:     `1px solid ${saved ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'}`,
        }}>
        {saving ? <><RefreshCw size={14} className="animate-spin" /> Sauvegarde…</> :
         saved  ? <><CheckCircle size={14} strokeWidth={2} /> Configuration enregistrée</> :
                  <><Save size={14} strokeWidth={1.8} /> Enregistrer la configuration</>}
      </button>
    </div>
  )
}

// ── Bloc : Calculateur tarifaire ──────────────────────────────────────────────
function PricingBlock({ adminKey }) {
  const [mode,         setMode]         = useState('simple')
  const [selectedPack, setSelectedPack] = useState('starter')
  const [participants, setParticipants] = useState('')
  const [editions,     setEditions]     = useState([{ name: 'Édition 1', participants: '' }])
  const [result,       setResult]       = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [detailOpen,   setDetailOpen]   = useState(false)

  function addEdition()           { setEditions(e => [...e, { name: `Édition ${e.length + 1}`, participants: '' }]) }
  function removeEdition(i)       { setEditions(e => e.filter((_, j) => j !== i)) }
  function updateEdition(i, k, v) { setEditions(e => e.map((ed, j) => j === i ? { ...ed, [k]: v } : ed)) }

  async function calculate() {
    setLoading(true); setResult(null)
    try {
      if (mode === 'simple') {
        const nb = parseInt(participants)
        if (!nb || nb <= 0) { setLoading(false); return }
        const res = await adminFetch(`/api/pricing/calculate?participants=${nb}&pack=${selectedPack}`, {}, adminKey)
        if (res.ok) setResult(await res.json())
      } else {
        const eds = editions.filter(e => parseInt(e.participants) > 0)
          .map(e => ({ name: e.name, expected_participants: parseInt(e.participants) }))
        if (!eds.length) { setLoading(false); return }
        const res = await adminFetch('/api/pricing/calculate-plan', {
          method: 'POST', body: JSON.stringify({ plan_type: selectedPack, editions: eds }),
        }, adminKey)
        if (res.ok) {
          const d = await res.json()
          setResult({
            pack: selectedPack, pack_label: selectedPack,
            nb_participants: eds.reduce((s, e) => s + e.expected_participants, 0),
            price_calculated: d.total_calculated,
            price_minimum: d.minimum,
            price_final: d.price_final,
            price_basis: d.price_basis,
            detail_tranches: (d.per_edition ?? []).map(e => ({
              label: e.name, nb: e.participants, rate: null, amount: e.price_calc,
            })),
            is_multi: true,
          })
        }
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      {/* Mode + Pack */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: '#8B9BB4' }}>Mode</p>
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#080E1E', border: '1px solid #1A2840' }}>
            {[{ id: 'simple', label: '1 édition' }, { id: 'multi', label: 'Multi-éditions' }].map(m => (
              <button key={m.id} onClick={() => { setMode(m.id); setResult(null) }}
                className="flex-1 py-1.5 rounded text-xs font-semibold transition"
                style={mode === m.id ? { background: 'rgba(99,102,241,0.2)', color: '#A5B4FC' } : { color: '#8B9BB4' }}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: '#8B9BB4' }}>Pack à simuler</p>
          <select className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
            style={{ background: '#080E1E', border: '1px solid #1A2840', colorScheme: 'dark' }}
            value={selectedPack} onChange={e => { setSelectedPack(e.target.value); setResult(null) }}>
            {PACKS.map(p => <option key={p.id} value={p.id}>{p.label} (min. {p.min})</option>)}
          </select>
        </div>
      </div>

      {mode === 'simple' ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: '#8B9BB4' }}>Participants attendus</p>
          <input type="number"
            className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
            style={{ background: '#080E1E', border: '1px solid #1A2840' }}
            placeholder="Ex : 15 000"
            value={participants}
            onChange={e => { setParticipants(e.target.value); setResult(null) }} />
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#8B9BB4' }}>
            Éditions
          </p>
          {editions.map((ed, i) => (
            <div key={i} className="grid grid-cols-5 gap-2 items-center">
              <input className="col-span-2 px-2.5 py-2 rounded-lg text-xs text-white outline-none"
                style={{ background: '#080E1E', border: '1px solid #1A2840' }}
                placeholder="Nom édition" value={ed.name}
                onChange={e => updateEdition(i, 'name', e.target.value)} />
              <input type="number"
                className="col-span-2 px-2.5 py-2 rounded-lg text-xs text-white outline-none"
                style={{ background: '#080E1E', border: '1px solid #1A2840' }}
                placeholder="Participants" value={ed.participants}
                onChange={e => { updateEdition(i, 'participants', e.target.value); setResult(null) }} />
              <button onClick={() => removeEdition(i)} disabled={editions.length === 1}
                className="py-2 rounded-lg text-xs text-[#4A5568] hover:text-[#EF4444] disabled:opacity-30">✕</button>
            </div>
          ))}
          <button onClick={addEdition} className="text-xs text-[#068EEA] hover:text-[#21AAFA] transition">
            + Ajouter une édition
          </button>
        </div>
      )}

      <button onClick={calculate} disabled={loading}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition hover:opacity-90 disabled:opacity-40"
        style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.35)', color: '#A5B4FC' }}>
        <Calculator size={14} strokeWidth={2} />
        {loading ? 'Calcul…' : 'Calculer le prix indicatif HT'}
      </button>

      {result && (
        <div className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.05)' }}>
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#8B9BB4]">
                {PACKS.find(p => p.id === result.pack)?.label ?? result.pack} · {fmt.number(result.nb_participants)} participants
              </p>
              <p className="text-xs mt-0.5" style={{ color: result.price_basis === 'minimum' ? '#F59E0B' : '#10B981' }}>
                {result.price_basis === 'minimum' ? '★ Minimum commercial appliqué' : '↗ Calcul par tranches progressives'}
              </p>
            </div>
            <p className="num text-2xl font-bold text-white">
              {result.price_final.toLocaleString('fr-FR')} € HT
            </p>
          </div>

          {result.detail_tranches?.length > 0 && (
            <div style={{ borderTop: '1px solid rgba(99,102,241,0.2)' }}>
              <button onClick={() => setDetailOpen(!detailOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-xs hover:bg-white/[0.03] transition"
                style={{ color: '#8B9BB4' }}>
                <span>{result.is_multi ? 'Détail par édition' : 'Détail par tranche'}</span>
                {detailOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              {detailOpen && (
                <div className="px-4 pb-4 space-y-1.5">
                  {result.detail_tranches.map((t, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <p className="text-[#8B9BB4]">{t.label}</p>
                      <div className="flex items-center gap-6">
                        <p className="num text-[#4A5568]">{fmt.number(t.nb)} pers.</p>
                        {t.rate && <p className="num text-[#4A5568]">{t.rate.toFixed(2)} €/pers.</p>}
                        <p className="num font-semibold text-white">{fmt.currency(t.amount)}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-xs pt-1"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-[#4A5568]">Sous-total calculé</p>
                    <p className="num text-[#8B9BB4]">{fmt.currency(result.price_calculated)}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <p className="text-[#4A5568]">Minimum commercial</p>
                    <p className="num text-[#8B9BB4]">{fmt.currency(result.price_minimum)}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-white pt-1"
                    style={{ borderTop: '1px solid rgba(99,102,241,0.2)' }}>
                    <p>Prix final HT</p>
                    <p className="num text-[#A5B4FC]">{fmt.currency(result.price_final)}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Barème rappel */}
      <div className="p-3 rounded-xl text-xs" style={{ background: '#080E1E', border: '1px solid #1A2840' }}>
        <p className="font-semibold text-white mb-2">Barème progressif</p>
        {[['0 – 2 000 participants', '1,00 € / participant'],
          ['2 001 – 5 000 participants', '0,75 € / participant'],
          ['5 001+ participants', '0,50 € / participant'],
        ].map(([t, r]) => (
          <div key={t} className="flex justify-between py-0.5">
            <p className="text-[#8B9BB4]">{t}</p>
            <p className="num text-white font-medium">{r}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Console principale ────────────────────────────────────────────────────────
export default function AdminConsole() {
  const [adminKey, setAdminKey] = useState(() =>
    sessionStorage.getItem(ADMIN_KEY_LS) ?? ''
  )
  const [activeTab, setActiveTab] = useState('config')

  function handleLogout() {
    sessionStorage.removeItem(ADMIN_KEY_LS)
    setAdminKey('')
  }

  if (!adminKey) return <LoginScreen onLogin={setAdminKey} />

  const TABS = [
    { id: 'config',  label: 'Configuration client', icon: Settings2  },
    { id: 'pricing', label: 'Calculateur tarifaire', icon: Calculator },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#05080F', color: '#F0F4FF' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4"
        style={{ background: '#0D1526', borderBottom: '1px solid #1A2840' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,0.15)' }}>
            <Shield size={16} style={{ color: '#A5B4FC' }} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Console Admin</p>
            <p className="text-xs text-[#8B9BB4]">Event Analytics — Opérateur</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#080E1E', border: '1px solid #1A2840' }}>
            {TABS.map(t => {
              const Icon = t.icon
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                  style={activeTab === t.id
                    ? { background: 'rgba(99,102,241,0.2)', color: '#A5B4FC' }
                    : { color: '#8B9BB4' }}>
                  <Icon size={12} strokeWidth={2} />
                  {t.label}
                </button>
              )
            })}
          </div>

          <button onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition hover:opacity-80"
            style={{ color: '#4A5568', border: '1px solid #1A2840' }}>
            <LogOut size={12} strokeWidth={2} />
            Déconnexion
          </button>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-2xl mx-auto px-6 py-6">
        {activeTab === 'config' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">Configuration client</h2>
              <p className="text-xs mt-0.5" style={{ color: '#8B9BB4' }}>
                Activation manuelle après paiement par virement. Non visible du client.
              </p>
            </div>
            <div className="rounded-2xl p-5" style={{ background: '#0D1526', border: '1px solid #1A2840' }}>
              <ConfigBlock adminKey={adminKey} />
            </div>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">Calculateur tarifaire</h2>
              <p className="text-xs mt-0.5" style={{ color: '#8B9BB4' }}>
                Outil commercial — indicatif HT. Aucun paiement déclenché.
              </p>
            </div>
            <div className="rounded-2xl p-5" style={{ background: '#0D1526', border: '1px solid #1A2840' }}>
              <PricingBlock adminKey={adminKey} />
            </div>
          </div>
        )}
      </div>

      {/* Footer discret */}
      <div className="text-center py-4">
        <p className="text-xs" style={{ color: '#1A2840' }}>
          Console opérateur — accès non référencé — URL confidentielle
        </p>
      </div>
    </div>
  )
}
