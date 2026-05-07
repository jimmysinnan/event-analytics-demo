import { useState, useEffect } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Ticket, Users, Euro, Gift, RefreshCw } from 'lucide-react'
import KpiCard from '../components/ui/KpiCard'
import SectionCard from '../components/ui/SectionCard'
import EmptyState from '../components/ui/EmptyState'
import BilletterieTracking from '../components/BilletterieTracking'
import { fmt } from '../lib/format'
import { useEdition } from '../context/EditionContext'
import { BILLETTERIE, AFFLUENCE } from '../lib/editionsData'
import { IS_DEMO } from '../lib/appMode'
import { API } from '../lib/api'
import { getChannels } from '../store/eventStore'

const LS_CHANNEL_TAB = 'ea_billetterie_channel_tab'

const REALISE_2025 = [
  { label: 'Pass Week-End Regular',          tickets: 8689, ca: 708274, type: 'payant'     },
  { label: 'Pass Week-End Zone Premium',     tickets: 333,  ca: 86626,  type: 'payant'     },
  { label: 'Invitation Zone Premium',        tickets: 189,  ca: 41950,  type: 'invitation' },
  { label: 'Invitation Zone A (Pass Jour)',  tickets: 2029, ca: 0,      type: 'invitation' },
  { label: 'Pass Samedi Regular',            tickets: 459,  ca: 27900,  type: 'payant'     },
  { label: 'Pass Samedi Zone Premium',       tickets: 19,   ca: 2660,   type: 'payant'     },
  { label: 'Pass Samedi Phase 2',            tickets: 30,   ca: 5400,   type: 'payant'     },
  { label: 'Invitation Samedi Zone Premium', tickets: 17,   ca: 700,    type: 'invitation' },
  { label: 'Pass Dimanche Regular',          tickets: 578,  ca: 41825,  type: 'payant'     },
  { label: 'Pass Dimanche Zone Premium',     tickets: 44,   ca: 6160,   type: 'payant'     },
  { label: 'Pass Dimanche Phase 2',          tickets: 45,   ca: 8100,   type: 'payant'     },
  { label: 'Invitation Dimanche Zone Prem.', tickets: 11,   ca: 100,    type: 'invitation' },
]

const VENTES_CANAL_PRINCIPAL = [
  { mois: 'Nov 24', nb: 682 }, { mois: 'Déc 24', nb: 41  }, { mois: 'Jan 25', nb: 7   },
  { mois: 'Fév 25', nb: 6   }, { mois: 'Mar 25', nb: 250 }, { mois: 'Avr 25', nb: 72  },
  { mois: 'Mai 25', nb: 189 }, { mois: 'Jun 25', nb: 469 }, { mois: 'Jul 25', nb: 284 },
]

const PASS_CULTURE = [
  { year: '2023', ventes: 1259, ca: 188850 },
  { year: '2024', ventes: 1775, ca: 225320 },
  { year: '2025', ventes: 516,  ca: 61920  },
]

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

export default function Billetterie() {
  const { year, activeEdition } = useEdition()
  const [tab,        setTab]        = useState('analyse')
  const [channelTab, setChannelTab] = useState(() =>
    localStorage.getItem(LS_CHANNEL_TAB) ?? 'total'
  )
  const [channels, setChannels] = useState([])

  const b  = IS_DEMO ? BILLETTERIE[year] : null
  const af = IS_DEMO ? AFFLUENCE[year]   : null

  const totalTickets2025 = REALISE_2025.reduce((s, r) => s + r.tickets, 0)
  const totalCA2025      = REALISE_2025.reduce((s, r) => s + r.ca,      0)

  // Production : données réelles depuis l'API
  const [liveBillet,    setLiveBillet]    = useState(null)
  const [liveLoading,   setLiveLoading]   = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    if (activeEdition?.id) {
      setChannels(getChannels(activeEdition.id))
    }
  }, [activeEdition?.id])

  // Re-fetch quand : édition change, refresh demandé, ou passage sur l'onglet Analyse
  useEffect(() => {
    if (IS_DEMO || !activeEdition?.id) { setLiveBillet(null); return }
    setLiveLoading(true)
    fetch(`${API}/api/editions/${activeEdition.id}/summary`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setLiveBillet(d?.billetterie ?? null))
      .catch(() => setLiveBillet(null))
      .finally(() => setLiveLoading(false))
  }, [activeEdition?.id, refreshTrigger, tab])

  function switchChannelTab(id) {
    setChannelTab(id)
    localStorage.setItem(LS_CHANNEL_TAB, id)
  }

  const activeChannel = channels.find(c => c.id === channelTab) ?? null

  return (
    <div className="space-y-5 animate-slide-up">

      {/* Tabs principaux */}
      <div className="flex items-center gap-1 p-1 rounded-xl w-fit" style={{ background: '#0D1526', border: '1px solid #1A2840' }}>
        {[
          { id: 'analyse', label: `Analyse ${year}` },
          { id: 'suivi',   label: 'Suivi édition en cours (live)' },
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

      {/* ── Onglet Suivi live ── */}
      {tab === 'suivi' && (
        <div className="space-y-4">

          {/* Switch canaux — mémorisé */}
          {channels.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-semibold uppercase tracking-wider mr-1" style={{ color: '#4A5568' }}>Vue :</p>

              {/* Total */}
              <button
                onClick={() => switchChannelTab('total')}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                style={{
                  background: channelTab === 'total' ? 'rgba(6,142,234,0.15)' : 'rgba(255,255,255,0.03)',
                  border:     `1px solid ${channelTab === 'total' ? 'rgba(6,142,234,0.35)' : '#1A2840'}`,
                  color:      channelTab === 'total' ? '#21AAFA' : '#8B9BB4',
                }}>
                Tous canaux
              </button>

              {/* Un bouton par canal */}
              {channels.map(ch => {
                const active = channelTab === ch.id
                return (
                  <button
                    key={ch.id}
                    onClick={() => switchChannelTab(ch.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                    style={{
                      background: active ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                      border:     `1px solid ${active ? '#6366F1' : '#1A2840'}`,
                      color:      active ? '#A5B4FC' : '#8B9BB4',
                    }}>
                    <span className="text-sm leading-none">{ch.icon ?? '📋'}</span>
                    {ch.name}
                  </button>
                )
              })}
            </div>
          )}

          {/* Header de contexte */}
          {channels.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(6,142,234,0.05)', border: '1px solid rgba(6,142,234,0.1)' }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10B981' }} />
              <p className="text-xs" style={{ color: '#8B9BB4' }}>
                {channelTab === 'total'
                  ? <><span className="text-white font-semibold">Vue consolidée</span> — tous canaux cumulés</>
                  : <><span className="text-white font-semibold">{activeChannel?.name ?? channelTab}</span> — données de ce canal uniquement</>
                }
              </p>
            </div>
          )}

          {/* Dashboard — total ou canal spécifique
              Pas de key= pour ne pas détruire/recréer le composant au switch de canal.
              Les dashboards existants restent visibles ; l'état sauvegardé se recharge silencieusement. */}
          <BilletterieTracking
            channelFilter={channelTab === 'total' ? null : channelTab}
          />
        </div>
      )}

      {/* ── Onglet Analyse année ── */}
      {tab === 'analyse' && (
        <>
          {/* Bandeau source */}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl"
            style={{ background: 'rgba(6,142,234,0.07)', border: '1px solid rgba(6,142,234,0.15)' }}>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#068EEA' }} />
              <p className="text-xs text-[#8B9BB4]">
                Édition <span className="text-white font-semibold">{activeEdition?.name ?? year}</span>
                {IS_DEMO && b ? ` — Plateforme : ${b.plateforme}` : ''}
                {!IS_DEMO && liveBillet ? ` — ${liveBillet.nb_commandes} commandes importées` : ''}
                {!IS_DEMO && !liveBillet && !liveLoading ? ' — Aucun import billetterie' : ''}
              </p>
            </div>
            {liveLoading
              ? <RefreshCw size={12} className="animate-spin text-[#4A5568]" />
              : !IS_DEMO && (
                <button
                  onClick={() => setRefreshTrigger(t => t + 1)}
                  title="Actualiser les données"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition hover:bg-[#1A2840]"
                  style={{ color: '#8B9BB4' }}>
                  <RefreshCw size={11} strokeWidth={2} />
                  Actualiser
                </button>
              )
            }
          </div>

          {/* KPI */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard label="Participants"
              value={IS_DEMO ? (af ? fmt.number(af.total) : b?.scans ? fmt.number(b.scans) : '—') : (liveBillet?.nb_participants ? fmt.number(liveBillet.nb_participants) : '—')}
              sub="Billetterie importée" delta={null} accent="blue" icon={Users} />
            <KpiCard label="CA Billetterie"
              value={IS_DEMO ? (b?.ca_billet ? fmt.currency(b.ca_billet) : '—') : (liveBillet?.ca_total ? fmt.currency(liveBillet.ca_total) : '—')}
              sub="Toutes formules" delta={null} accent="gold" icon={Euro} />
            <KpiCard label="Commandes"
              value={IS_DEMO ? (IS_DEMO && year === 2025 ? fmt.number(totalTickets2025) : b?.familles_tarifaires?.[0]?.nb ? fmt.number(b.familles_tarifaires[0].nb) : '—') : (liveBillet?.nb_commandes ? fmt.number(liveBillet.nb_commandes) : '—')}
              sub={IS_DEMO && year === 2025 ? '31% invitations' : 'Importées'}
              delta={null} accent="teal" icon={Ticket} />
            <KpiCard label="CSE / partenaires"
              value={IS_DEMO && year === 2025 ? fmt.number(2704) : '—'}
              sub={IS_DEMO && year === 2025 ? fmt.currency(236928) : `Voir données ${year}`}
              delta={null} accent="violet" icon={Gift} />
          </div>

          {/* Production : graphiques depuis imports ─────────────────────────── */}
          {!IS_DEMO && liveBillet && liveBillet.top_tarifs.length > 0 && (
            <div className="grid xl:grid-cols-2 gap-4">
              <SectionCard title="Top tarifs importés" subtitle={`${liveBillet.nb_commandes} commandes · ${liveBillet.nb_participants} participants`}>
                <div className="space-y-2">
                  {liveBillet.top_tarifs.slice(0, 8).map((t, i) => (
                    <div key={t.tarif}>
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs text-[#8B9BB4] truncate pr-2">{t.tarif}</p>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <p className="num text-xs font-semibold text-white">{fmt.number(t.nb)}</p>
                          <p className="num text-2xs text-[#4A5568] w-9 text-right">{t.pct}%</p>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: '#1A2840' }}>
                        <div className="h-full rounded-full" style={{ width: `${t.pct}%`, background: i === 0 ? '#F59E0B' : i < 3 ? '#068EEA' : '#2A3850' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
              {liveBillet.ventes_par_mois.length > 1 && (
                <SectionCard title="Courbe de vente" subtitle="Commandes par mois">
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={liveBillet.ventes_par_mois}>
                      <defs>
                        <linearGradient id="gradBV" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}   />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1A2840" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="mois" tick={{ fill: '#8B9BB4', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#8B9BB4', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip contentStyle={{ background: '#111D33', border: '1px solid #1A2840', borderRadius: '0.75rem' }}
                        formatter={v => [fmt.number(v), 'Commandes']} />
                      <Area type="monotone" dataKey="nb" stroke="#F59E0B" strokeWidth={2}
                        fill="url(#gradBV)" dot={false} activeDot={{ r: 4, fill: '#F59E0B' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </SectionCard>
              )}
            </div>
          )}
          {!IS_DEMO && !liveBillet && !liveLoading && (
            <EmptyState
              message="Aucune billetterie importée pour cette édition"
              hint="Importez un fichier billetterie depuis la page Importer données pour alimenter cet onglet."
            />
          )}

          {/* Familles tarifaires — demo uniquement */}
          {b?.familles_tarifaires && (
            <SectionCard title={`Répartition par formule — ${year}`} subtitle="Volumes par type de billet">
              <div className="space-y-2">
                {b.familles_tarifaires.map(({ tarif, nb, color }) => {
                  const total = b.familles_tarifaires.reduce((s, d) => s + d.nb, 0)
                  const pct   = total ? ((nb / total) * 100).toFixed(1) : 0
                  return (
                    <div key={tarif}>
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                          <p className="text-xs text-[#8B9BB4] truncate pr-2">{tarif}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <p className="num text-xs font-semibold text-white">{fmt.number(nb)}</p>
                          <p className="num text-2xs text-[#4A5568] w-8 text-right">{pct}%</p>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: '#1A2840' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </SectionCard>
          )}

          {/* Données spécifiques 2025 */}
          {IS_DEMO && year === 2025 && (
            <>
              <div className="grid xl:grid-cols-2 gap-4">
                <SectionCard title="Ventes canal principal par mois" subtitle="Nov 2024 → Jul 2025">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={VENTES_CANAL_PRINCIPAL} barSize={20} barCategoryGap="30%">
                      <CartesianGrid vertical={false} stroke="#1A2840" strokeDasharray="3 3" />
                      <XAxis dataKey="mois" tick={{ fill: '#8B9BB4', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#8B9BB4', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip content={<Tip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                      <Bar dataKey="nb" name="Commandes" radius={[4, 4, 0, 0]}>
                        {VENTES_CANAL_PRINCIPAL.map(d => (
                          <Cell key={d.mois}
                            fill={d.mois === 'Nov 24' ? '#F59E0B' : d.nb >= 250 ? '#068EEA' : '#2A3850'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </SectionCard>

                <SectionCard title="Pass Culture" subtitle="2023 · 2024 · 2025"
                  action={<span className="inline-flex px-2 py-0.5 rounded-full text-2xs font-semibold"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>−71% en 2025</span>}>
                  <div className="grid grid-cols-3 gap-3">
                    {PASS_CULTURE.map(d => (
                      <div key={d.year} className="text-center p-3 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${d.year === '2025' ? 'rgba(239,68,68,0.2)' : '#1A2840'}` }}>
                        <p className="text-2xs mb-1"
                          style={{ color: d.year === '2025' ? '#EF4444' : d.year === '2024' ? '#068EEA' : '#4A5568' }}>{d.year}</p>
                        <p className="num text-xl font-bold text-white">{fmt.number(d.ventes)}</p>
                        <p className="num text-xs text-[#8B9BB4] mt-0.5">{fmt.currency(d.ca)}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>

              <SectionCard title="Réalisé billetterie 2025" subtitle="Toutes formules · tickets et CA">
                <div>
                  <div className="grid grid-cols-12 gap-2 px-2 pb-2 border-b border-[#1A2840]">
                    <p className="col-span-5 text-2xs font-semibold text-[#4A5568] uppercase tracking-wider">Formule</p>
                    <p className="col-span-3 text-2xs font-semibold text-[#4A5568] uppercase tracking-wider text-right">Tickets</p>
                    <p className="col-span-4 text-2xs font-semibold text-[#4A5568] uppercase tracking-wider text-right">CA</p>
                  </div>
                  {REALISE_2025.map((r, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 px-2 py-2 border-b border-[#1A2840]/40 last:border-0 hover:bg-[#111D33]/40 rounded transition-colors">
                      <div className="col-span-5 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: r.type === 'invitation' ? '#F59E0B' : '#068EEA' }} />
                        <p className="text-xs text-[#8B9BB4] truncate leading-tight">{r.label}</p>
                      </div>
                      <p className="col-span-3 num text-xs font-semibold text-white text-right self-center">{fmt.number(r.tickets)}</p>
                      <div className="col-span-4 text-right self-center">
                        {r.ca === 0
                          ? <span className="text-2xs px-1.5 py-0.5 rounded font-semibold" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>0 €</span>
                          : <p className="num text-xs font-semibold text-white">{fmt.currency(r.ca)}</p>}
                      </div>
                    </div>
                  ))}
                  <div className="grid grid-cols-12 gap-2 px-2 pt-2 mt-1 border-t-2 border-[#1A2840]">
                    <p className="col-span-5 text-xs font-bold text-white">Total</p>
                    <p className="col-span-3 num text-xs font-bold text-white text-right">{fmt.number(totalTickets2025)}</p>
                    <p className="col-span-4 num text-xs font-bold text-white text-right">{fmt.currency(totalCA2025)}</p>
                  </div>
                </div>
              </SectionCard>
            </>
          )}

          {/* Affluence */}
          {IS_DEMO && (AFFLUENCE[year] || AFFLUENCE[year - 1]) && (
            <SectionCard title={`Affluence ${year}`} subtitle={`Comparaison avec ${year - 1}`}>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Samedi',   cur: AFFLUENCE[year]?.samedi,   prev: AFFLUENCE[year - 1]?.samedi   },
                  { label: 'Dimanche', cur: AFFLUENCE[year]?.dimanche,  prev: AFFLUENCE[year - 1]?.dimanche },
                  { label: 'Total',    cur: AFFLUENCE[year]?.total,     prev: AFFLUENCE[year - 1]?.total    },
                ].map(({ label, cur, prev: pv }) => {
                  const delta = cur && pv ? ((cur - pv) / pv * 100).toFixed(1) : null
                  const neg   = delta < 0
                  return (
                    <div key={label} className="text-center p-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1A2840' }}>
                      <p className="text-xs font-semibold text-[#8B9BB4] mb-2">{label}</p>
                      <p className="num text-xl font-bold text-white">{cur ? fmt.number(cur) : '—'}</p>
                      {delta && (
                        <p className="num text-xs font-semibold mt-1" style={{ color: neg ? '#EF4444' : '#10B981' }}>
                          {delta}% vs {year - 1}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  )
}
