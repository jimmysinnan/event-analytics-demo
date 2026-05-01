import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts'
import { Users, Euro, ShoppingBag, Ticket, Gift, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react'
import KpiCard from '../components/ui/KpiCard'
import SectionCard from '../components/ui/SectionCard'
import { fmt } from '../lib/format'
import { useEdition } from '../context/EditionContext'
import { CONSO, BILLETTERIE, OVERVIEW, AFFLUENCE } from '../lib/editionsData'

const PASS_CULTURE = [
  { year: '2023', ventes: 1259, ca: 188850 },
  { year: '2024', ventes: 1775, ca: 225320 },
  { year: '2025', ventes: 516,  ca: 61920  },
]

const PANIER_TREND = OVERVIEW.filter(d => d.ca_conso).map(d => ({
  year: String(d.year), panier: d.panier, transactions: d.clients,
}))

function CustomTooltip({ active, payload, label, type = 'currency' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2.5 text-xs" style={{ background: '#111D33', border: '1px solid #1A2840' }}>
      <p className="font-semibold text-[#8B9BB4] uppercase tracking-wider mb-1.5">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="num font-semibold" style={{ color: p.color }}>
          {p.name} : {type === 'currency' ? fmt.currency(p.value) : fmt.number(p.value)}
        </p>
      ))}
    </div>
  )
}

function InlineDelta({ value }) {
  if (value === null || value === undefined) return <span className="text-[#4A5568] text-xs">—</span>
  const up = value > 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold num"
      style={{ color: up ? '#10B981' : '#EF4444' }}>
      <Icon size={12} strokeWidth={2.5} />
      {Math.abs(value).toFixed(1)} %
    </span>
  )
}

function CompareRow({ label, v23, v24, v25, format = 'currency', activeYear }) {
  const fmt_v = v => format === 'currency' ? fmt.currency(v) : fmt.number(v)
  const max = Math.max(v23 ?? 0, v24 ?? 0, v25 ?? 0)
  const pct = v => max ? (v / max) * 100 : 0
  return (
    <div className="py-3 border-b border-[#1A2840] last:border-0">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs text-[#8B9BB4]">{label}</p>
        <div className="flex items-center gap-4">
          {[{ y: '2023', v: v23, c: '#4A5568' }, { y: '2024', v: v24, c: '#068EEA' }, { y: '2025', v: v25, c: '#F59E0B' }].map(({ y, v, c }) => (
            <div key={y} className="text-right">
              <p className="text-2xs font-medium uppercase tracking-wide"
                style={{ color: String(activeYear) === y ? c : '#4A5568' }}>{y}</p>
              <p className="num text-xs font-semibold"
                style={{ color: String(activeYear) === y ? '#F0F4FF' : '#8B9BB4' }}>
                {v ? fmt_v(v) : '—'}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        {[{ v: v23, c: '#4A5568' }, { v: v24, c: '#068EEA' }, { v: v25, c: '#F59E0B' }].map(({ v, c }, i) => (
          <div key={i} className="h-1 rounded-full" style={{ background: '#1A2840' }}>
            <div className="h-full rounded-full" style={{ width: `${pct(v ?? 0)}%`, background: c }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function NoData({ year, module }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2"
      style={{ background: 'rgba(74,85,104,0.1)', borderRadius: '0.75rem', border: '1px dashed #1A2840' }}>
      <Info size={20} className="text-[#4A5568]" strokeWidth={1.5} />
      <p className="text-xs text-[#4A5568] text-center">
        Données {module} non disponibles pour <span className="text-[#8B9BB4] font-semibold">{year}</span>
      </p>
    </div>
  )
}

export default function VueGlobale() {
  const { year } = useEdition()
  const conso   = CONSO[year]
  const billet  = BILLETTERIE[year]
  const prev    = CONSO[year - 1]

  const delta_ca    = prev ? fmt.delta(conso?.ca, prev?.ca) : null
  const delta_cli   = prev ? fmt.delta(conso?.clients, prev?.clients) : null
  const delta_freq  = (() => {
    const af = AFFLUENCE[year]
    const afPrev = AFFLUENCE[year - 1]
    return af && afPrev ? fmt.delta(af.total, afPrev.total) : null
  })()
  const delta_billet = (() => {
    const bPrev = BILLETTERIE[year - 1]
    return billet?.ca_billet && bPrev?.ca_billet ? fmt.delta(billet.ca_billet, bPrev.ca_billet) : null
  })()

  return (
    <div className="space-y-6 animate-slide-up">

      {/* Bandeau édition sélectionnée */}
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
        style={{ background: 'color-mix(in srgb, var(--event-primary, #068EEA) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--event-primary, #068EEA) 18%, transparent)' }}>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--event-primary, #068EEA)' }} />
        <p className="text-xs text-[#8B9BB4]">
          Édition affichée : <span className="text-white font-semibold">{year}</span>
          {conso ? ` — Source : ${conso.plateforme}` : ' — Données limitées'}
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="CA Consommation" value={conso ? fmt.currency(conso.ca) : '—'}
          sub={conso ? 'Hors frais & consignes' : `Indisponible ${year}`}
          delta={delta_ca} accent="blue" icon={Euro} />
        <KpiCard label="Festivaliers" value={AFFLUENCE[year] ? fmt.number(AFFLUENCE[year].total) : billet?.scans ? fmt.number(billet.scans) : '—'}
          sub="Entrées scannées" delta={delta_freq} accent="teal" icon={Users} />
        <KpiCard label="CA Billetterie" value={billet?.ca_billet ? fmt.currency(billet.ca_billet) : '—'}
          sub={billet?.ca_billet ? 'Toutes formules' : 'Non consolidé'}
          delta={delta_billet} accent="gold" icon={Ticket} />
        <KpiCard label="Clients acheteurs" value={conso ? fmt.number(conso.clients) : '—'}
          sub={conso ? `Panier ${fmt.currency(conso.panier)}` : 'Indisponible'}
          delta={delta_cli} accent="violet" icon={ShoppingBag} />
      </div>

      {/* Graphiques principaux */}
      <div className="grid xl:grid-cols-3 gap-4">

        {/* CA multi-éditions — toujours comparatif */}
        <SectionCard title="CA Consommation — évolution" subtitle="Comparatif 2023 · 2024 · 2025" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={OVERVIEW.filter(d => d.ca_conso)} barSize={28} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke="#1A2840" strokeDasharray="3 3" />
              <XAxis dataKey="year" tick={{ fill: '#8B9BB4', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8B9BB4', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v/1000).toFixed(0)}k€`} width={48} />
              <Tooltip content={<CustomTooltip type="currency" />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="ca_conso" name="CA Conso" radius={[4,4,0,0]}>
                {OVERVIEW.filter(d => d.ca_conso).map(d => (
                  <Cell key={d.year}
                    fill={d.year === year ? '#F59E0B' : d.year === 2024 ? '#068EEA' : '#4A5568'}
                    opacity={d.year === year ? 1 : 0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 pt-1">
            {OVERVIEW.filter(d => d.ca_conso).map(d => (
              <span key={d.year} className="flex items-center gap-1.5 text-xs"
                style={{ color: d.year === year ? '#F59E0B' : '#8B9BB4' }}>
                <span className="w-2 h-2 rounded-full"
                  style={{ background: d.year === year ? 'var(--event-secondary, #F59E0B)' : d.year === 2024 ? 'var(--event-primary, #068EEA)' : '#4A5568' }} />
                {d.year}{d.year === year && ' ✦'}
              </span>
            ))}
          </div>
        </SectionCard>

        {/* Familles produit — année sélectionnée */}
        <SectionCard title={`Répartition CA ${year}`} subtitle="Par famille produit">
          {conso ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={conso.familles} dataKey="ca" nameKey="name"
                    cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={2} strokeWidth={0}>
                    {conso.familles.map(d => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={v => fmt.currency(v)}
                    contentStyle={{ background: '#111D33', border: '1px solid #1A2840', borderRadius: '0.75rem' }}
                    itemStyle={{ color: '#F0F4FF', fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {conso.familles.slice(0,6).map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-2xs text-[#8B9BB4] truncate">{d.name}</span>
                    <span className="num text-2xs text-white ml-auto font-medium">
                      {((d.ca / conso.familles.reduce((s,x)=>s+x.ca,0))*100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : <NoData year={year} module="consommation" />}
        </SectionCard>
      </div>

      {/* Comparatif + Pass Culture */}
      <div className="grid xl:grid-cols-3 gap-4">

        <SectionCard title="Comparatif multi-indicateurs" subtitle="2023 · 2024 · 2025" className="xl:col-span-2">
          <CompareRow label="CA Consommation (€)" v23={888537} v24={742968} v25={496585} activeYear={year} />
          <CompareRow label="CA Billetterie (€)" v23={null} v24={1019418} v25={929695} activeYear={year} />
          <CompareRow label="Clients acheteurs" v23={11735} v24={9177} v25={7251} format="number" activeYear={year} />
          <CompareRow label="Festivaliers scannés" v23={null} v24={20346} v25={16810} format="number" activeYear={year} />
          <div className="pt-2 flex items-center gap-6">
            {[{ label: 'CA Conso 25 vs 24', v: -33.2 }, { label: 'Fréquentation 25 vs 24', v: -17.4 }, { label: 'CA Billet 25 vs 24', v: -8.8 }].map(({ label, v }) => (
              <div key={label} className="text-center">
                <p className="text-2xs text-[#4A5568] mb-1">{label}</p>
                <InlineDelta value={v} />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Pass Culture" subtitle="Ventes par édition"
          action={<span className="inline-flex px-2 py-0.5 rounded-full text-2xs font-semibold"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>−71% en 2025</span>}>
          <div className="space-y-3">
            {PASS_CULTURE.map(d => (
              <div key={d.year} className="flex items-center gap-3">
                <span className="num text-2xs font-bold w-10"
                  style={{ color: d.year === String(year) ? '#F59E0B' : d.year === '2024' ? '#068EEA' : '#4A5568' }}>{d.year}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#8B9BB4]">{fmt.number(d.ventes)} billets</span>
                    <span className="num text-white font-medium">{fmt.currency(d.ca)}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: '#1A2840' }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${(d.ventes/1775)*100}%`,
                        background: d.year === String(year) ? 'var(--event-secondary, #F59E0B)' : d.year === '2024' ? 'var(--event-primary, #068EEA)' : '#4A5568' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Panier moyen + plateformes */}
      <div className="grid xl:grid-cols-3 gap-4">

        <SectionCard title="Panier moyen — tendance">
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={PANIER_TREND}>
              <defs>
                <linearGradient id="gradP" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#068EEA" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#068EEA" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1A2840" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: '#8B9BB4', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8B9BB4', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${v}€`} width={36} />
              <Tooltip formatter={v => [`${v} €`, 'Panier']}
                contentStyle={{ background: '#111D33', border: '1px solid #1A2840', borderRadius: '0.75rem' }} />
              <Area type="monotone" dataKey="panier" name="Panier moyen" stroke="#068EEA" strokeWidth={2}
                fill="url(#gradP)" dot={{ fill: '#068EEA', r: 4 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* Plateformes billetterie par année */}
        <SectionCard title="Plateformes billetterie" subtitle="Par édition" className="xl:col-span-2">
          <div className="grid grid-cols-3 gap-3">
            {[2023, 2024, 2025].map(y => {
              const b = BILLETTERIE[y]
              return (
                <div key={y} className="p-3 rounded-xl transition-all duration-200"
                  style={{ background: y === year ? 'rgba(6,142,234,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${y === year ? 'rgba(6,142,234,0.25)' : '#1A2840'}` }}>
                  <p className="text-2xs font-bold uppercase tracking-widest mb-2"
                    style={{ color: y === year ? '#21AAFA' : '#4A5568' }}>{y}</p>
                  <p className="text-xs font-semibold text-white leading-snug">{b?.plateforme ?? 'N/A'}</p>
                  {b?.ca_billet && <p className="num text-xs text-[#8B9BB4] mt-1">{fmt.currency(b.ca_billet)}</p>}
                  {b?.scans && <p className="num text-2xs text-[#4A5568] mt-0.5">{fmt.number(b.scans)} entrées</p>}
                </div>
              )
            })}
          </div>
        </SectionCard>
      </div>

    </div>
  )
}
