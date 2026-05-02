import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import { Package, TrendingDown, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import KpiCard    from '../components/ui/KpiCard'
import SectionCard from '../components/ui/SectionCard'
import EmptyState  from '../components/ui/EmptyState'
import { fmt }    from '../lib/format'
import { useEdition } from '../context/EditionContext'

// Années pour lesquelles les prévisions stocks sont disponibles
// Format : BASE_YEAR → projection pour BASE_YEAR+1
const STOCKS_BASE_YEARS = [2025]  // ajouter 2026, 2027... au fur et à mesure

const ASSUMPTIONS = [
  { bar: 'Zone Nord',       t24: 5417, t25: 595,  factor: -0.10, t26: 536,  color: '#068EEA', key: 'zone-nord'     },
  { bar: 'Zone Sud',        t24: 6574, t25: 1127, factor: -0.10, t26: 1014, color: '#06B6D4', key: 'zone-sud'      },
  { bar: 'Zone VIP',        t24: 3980, t25: 1321, factor: -0.10, t26: 1189, color: '#8B5CF6', key: 'zone-vip'      },
  { bar: 'Zone Partenaire', t24: 252,  t25: 109,  factor: -0.10, t26: 98,   color: '#F59E0B', key: 'partenaire'    },
  { bar: 'Zone VIP Int.',   t24: 604,  t25: 320,  factor: -0.091,t26: 291,  color: '#F97316', key: 'vip-interieur' },
]

const TOTAL_2025 = ASSUMPTIONS.reduce((s, d) => s + d.t25, 0)
const TOTAL_2026 = ASSUMPTIONS.reduce((s, d) => s + d.t26, 0)

const BARS_DETAIL = {
  'Zone Nord': {
    heures:   [{h:'17h',v:57},{h:'18h',v:90},{h:'19h',v:121},{h:'20h',v:101},{h:'21h',v:95},{h:'22h',v:45},{h:'23h',v:28}],
    produits: [
      { name: 'Champagne Premium A', pct: 29.1, q26: 156, color: '#F59E0B' },
      { name: 'Cocktail Signature',  pct: 28.7, q26: 154, color: '#068EEA' },
      { name: 'Champagne Prestige',  pct: 19.8, q26: 106, color: '#8B5CF6' },
      { name: 'Rosé Premium',        pct: 15.1, q26: 81,  color: '#10B981' },
      { name: 'Spiritueux Vieux',    pct: 7.1,  q26: 38,  color: '#F97316' },
    ]
  },
  'Zone Sud': {
    heures:   [{h:'17h',v:109},{h:'18h',v:171},{h:'19h',v:229},{h:'20h',v:193},{h:'21h',v:181},{h:'22h',v:85},{h:'23h',v:50}],
    produits: [
      { name: 'Cocktail Tropical A', pct: 27.4, q26: 278, color: '#06B6D4' },
      { name: 'Cocktail Tropical B', pct: 24.0, q26: 244, color: '#068EEA' },
      { name: 'Champagne Premium A', pct: 15.0, q26: 152, color: '#F59E0B' },
      { name: 'Cocktail Signature',  pct: 14.2, q26: 144, color: '#8B5CF6' },
      { name: 'Spiritueux Vieux',    pct: 11.2, q26: 114, color: '#F97316' },
    ]
  },
  'Zone VIP': {
    heures:   [{h:'17h',v:119},{h:'18h',v:190},{h:'19h',v:249},{h:'20h',v:214},{h:'21h',v:200},{h:'22h',v:95},{h:'23h',v:55}],
    produits: [
      { name: 'Champagne Premium A', pct: 35.2, q26: 419, color: '#F59E0B' },
      { name: 'Champagne Luxe',      pct: 25.1, q26: 298, color: '#EF4444' },
      { name: 'Cocktail Signature',  pct: 18.0, q26: 214, color: '#068EEA' },
      { name: 'Spiritueux Vieux',    pct: 12.5, q26: 149, color: '#F97316' },
      { name: 'Rosé Premium',        pct: 9.2,  q26: 109, color: '#10B981' },
    ]
  },
}

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2.5 text-xs" style={{ background: '#111D33', border: '1px solid #1A2840' }}>
      <p className="font-semibold text-[#8B9BB4] uppercase tracking-wider mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="num font-semibold" style={{ color: p.color || '#F0F4FF' }}>
          {p.name}: {p.value} unités
        </p>
      ))}
    </div>
  )
}

export default function Stocks() {
  const { year } = useEdition()
  const [activeBar, setActiveBar] = useState('Zone Nord')
  const detail = BARS_DETAIL[activeBar]

  // Ce module affiche les prévisions pour l'édition suivante (year+1),
  // calculées à partir des données de l'année de base.
  // Les prévisions ne sont disponibles que si year est dans STOCKS_BASE_YEARS.
  const hasData   = STOCKS_BASE_YEARS.includes(year)
  const nextYear  = year + 1

  if (!hasData) {
    return (
      <div className="space-y-4 animate-slide-up">
        <EmptyState
          year={year}
          module="Stocks Édition+1"
          message={`Les prévisions de stocks pour l'édition ${nextYear} ne sont pas encore disponibles.`}
          hint={`Les prévisions sont calculées à partir des données de consommation de l'édition de base. Les prévisions ${nextYear} (basées sur ${year}) seront disponibles après import des données ${year}.`}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-up">

      {/* Note */}
      <div className="p-3 rounded-xl flex items-start gap-3"
        style={{ background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.15)' }}>
        <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#06B6D4' }} />
        <p className="text-xs text-[#8B9BB4]">
          Prévisions pour l'édition <span className="text-white font-semibold">{nextYear}</span> basées sur les volumes {year} avec un facteur <span className="text-white font-semibold">−10%</span>
          (hypothèse conservative). Source : <span className="text-white">Previsions_stock_{nextYear}_PAR_BAR_HEURE_PRODUIT.xlsx</span>
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Total prévu 2026"  value={fmt.number(TOTAL_2026)} sub="Toutes zones"         delta={null}  accent="blue"   icon={Package}      />
        <KpiCard label="Base 2025"         value={fmt.number(TOTAL_2025)} sub="Volumes réels"        delta={-10.0} accent="gold"   icon={TrendingDown} />
        <KpiCard label="Zones pilotées"    value="5"                       sub="Bars + Partenaire"    delta={null}  accent="teal"   icon={CheckCircle}  />
        <KpiCard label="Pic de service"    value="19h"                     sub="Planifier réassorts"  delta={null}  accent="violet" icon={Clock}        />
      </div>

      {/* Comparatif bars + tableau */}
      <div className="grid xl:grid-cols-2 gap-4">

        <SectionCard title="Volume 2026 par zone" subtitle="2025 réel vs 2026 prévu">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ASSUMPTIONS} barSize={16} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke="#1A2840" strokeDasharray="3 3" />
              <XAxis dataKey="bar" tick={{ fill: '#8B9BB4', fontSize: 9 }} axisLine={false} tickLine={false}
                tickFormatter={v => v.split(' ')[0]} />
              <YAxis tick={{ fill: '#8B9BB4', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<Tip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="t25" name="2025 réel" radius={[3,3,0,0]}>
                {ASSUMPTIONS.map(d => <Cell key={d.bar} fill={`${d.color}50`} />)}
              </Bar>
              <Bar dataKey="t26" name="2026 prévu" radius={[3,3,0,0]}>
                {ASSUMPTIONS.map(d => <Cell key={d.bar} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-2xs text-[#4A5568]">
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-2 rounded opacity-40" style={{ background: '#8B9BB4' }} />2025</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-2 rounded" style={{ background: '#068EEA' }} />2026 prév.</span>
          </div>
        </SectionCard>

        <SectionCard title="Tableau de bord stocks" subtitle="Détail par zone — historique et prévision">
          <div>
            <div className="grid grid-cols-12 gap-2 px-2 pb-2 border-b border-[#1A2840]">
              {['Zone','2024','2025','Δ','2026'].map((h, i) => (
                <p key={h} className={`text-2xs font-semibold text-[#4A5568] uppercase tracking-wider ${i===0?'col-span-4':'col-span-2 text-right'}`}>{h}</p>
              ))}
            </div>
            {ASSUMPTIONS.map((d, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 px-2 py-2.5 border-b border-[#1A2840]/40 last:border-0
                                       hover:bg-[#111D33]/40 rounded transition-colors cursor-pointer"
                onClick={() => d.bar in BARS_DETAIL && setActiveBar(d.bar)}>
                <div className="col-span-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  <p className="text-xs text-[#8B9BB4] truncate">{d.bar.split(' ')[0]}</p>
                </div>
                <p className="col-span-2 num text-xs text-[#4A5568] text-right self-center">{fmt.number(d.t24)}</p>
                <p className="col-span-2 num text-xs text-white text-right self-center font-medium">{fmt.number(d.t25)}</p>
                <p className="col-span-2 num text-xs text-right self-center text-[#EF4444]">{(d.factor*100).toFixed(0)}%</p>
                <p className="col-span-2 num text-xs font-bold text-right self-center" style={{ color: d.color }}>{fmt.number(d.t26)}</p>
              </div>
            ))}
            <div className="grid grid-cols-12 gap-2 px-2 pt-2 mt-1 border-t-2 border-[#1A2840]">
              <p className="col-span-4 text-xs font-bold text-white">Total</p>
              <p className="col-span-2 num text-xs text-[#4A5568] text-right">{fmt.number(ASSUMPTIONS.reduce((s,d)=>s+d.t24,0))}</p>
              <p className="col-span-2 num text-xs font-bold text-white text-right">{fmt.number(TOTAL_2025)}</p>
              <p className="col-span-2 num text-xs text-[#EF4444] text-right">−10%</p>
              <p className="col-span-2 num text-xs font-bold text-right" style={{ color: '#068EEA' }}>{fmt.number(TOTAL_2026)}</p>
            </div>
          </div>
          <p className="text-2xs text-[#4A5568] mt-2">Cliquer sur une zone pour voir le détail horaire et produits ci-dessous.</p>
        </SectionCard>
      </div>

      {/* Détail zone sélectionnée */}
      <SectionCard
        title={`Détail zone — ${activeBar}`}
        subtitle="Prévision horaire et répartition produits 2026"
        action={
          <div className="flex gap-1 flex-wrap">
            {Object.keys(BARS_DETAIL).map(bar => (
              <button key={bar} onClick={() => setActiveBar(bar)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150"
                style={activeBar === bar
                  ? { background: 'rgba(6,142,234,0.15)', color: '#21AAFA', border: '1px solid rgba(6,142,234,0.25)' }
                  : { background: 'transparent', color: '#8B9BB4', border: '1px solid #1A2840' }
                }>
                {bar.split(' ')[0]}
              </button>
            ))}
          </div>
        }
      >
        {detail ? (
          <div className="grid xl:grid-cols-2 gap-6">
            {/* Horaire */}
            <div>
              <p className="text-xs font-semibold text-[#8B9BB4] uppercase tracking-wider mb-3">Prévision horaire</p>
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={detail.heures} barSize={22} barCategoryGap="25%">
                  <CartesianGrid vertical={false} stroke="#1A2840" strokeDasharray="3 3" />
                  <XAxis dataKey="h" tick={{ fill: '#8B9BB4', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8B9BB4', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<Tip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="v" name="Unités prévues 2026" radius={[4,4,0,0]}>
                    {detail.heures.map((d, i) => (
                      <Cell key={i} fill={d.v === Math.max(...detail.heures.map(x=>x.v)) ? '#F59E0B' : ASSUMPTIONS.find(a=>a.bar===activeBar)?.color ?? '#068EEA'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-2xs text-[#4A5568] mt-1">
                Pic à <span className="text-white font-semibold">19h</span> — <span className="text-white font-semibold">{detail.heures.find(h=>h.h==='19h')?.v}</span> unités.
                Réassort conseillé avant 18h30.
              </p>
            </div>

            {/* Produits */}
            <div>
              <p className="text-xs font-semibold text-[#8B9BB4] uppercase tracking-wider mb-3">
                Répartition produits — {fmt.number(detail.produits.reduce((s,d)=>s+d.q26,0))} unités totales
              </p>
              <div className="space-y-2.5">
                {detail.produits.map(({ name, pct, q26, color }) => (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                        <p className="text-xs text-[#8B9BB4] truncate">{name}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <p className="num text-xs font-semibold text-white">{q26} unités</p>
                        <p className="num text-2xs text-[#4A5568] w-7 text-right">{pct.toFixed(0)}%</p>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: '#1A2840' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[#4A5568] py-4 text-center">Sélectionner une zone pour voir le détail.</p>
        )}
      </SectionCard>

    </div>
  )
}
