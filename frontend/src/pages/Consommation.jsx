import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { ShoppingCart, Euro, Users, Star, Info } from 'lucide-react'
import KpiCard from '../components/ui/KpiCard'
import SectionCard from '../components/ui/SectionCard'
import { fmt } from '../lib/format'
import { useEdition } from '../context/EditionContext'
import { CONSO, OVERVIEW } from '../lib/editionsData'
import { IS_DEMO } from '../lib/appMode'

// CA horaire 2025 uniquement — pas disponible sur les autres années dans le même format
const CA_HORAIRE_2025 = [
  { h: '15h', ca: 1349  }, { h: '16h', ca: 10816 }, { h: '17h', ca: 30879 },
  { h: '18h', ca: 50965 }, { h: '19h', ca: 70942 }, { h: '20h', ca: 57416 },
  { h: '21h', ca: 50408 }, { h: '22h', ca: 30528 }, { h: '23h', ca: 19100 },
]

const TOP_ARTICLES_2025 = [
  { art: 'Champagne (toutes marques)',  qty: 4540 },
  { art: 'Boisson Soft 1',             qty: 3858 },
  { art: 'Boisson Soft 2',             qty: 3719 },
  { art: 'Bière Signature',            qty: 2301 },
  { art: 'Cocktail Signature',         qty: 1628 },
  { art: 'Cocktail Tropical',          qty: 1447 },
]

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2.5 text-xs" style={{ background: '#111D33', border: '1px solid #1A2840' }}>
      <p className="font-semibold text-[#8B9BB4] uppercase tracking-wider mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="num font-semibold" style={{ color: p.color || '#F0F4FF' }}>
          {p.name}: {fmt.currency(p.value)}
        </p>
      ))}
    </div>
  )
}

function NoData({ year, detail }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 gap-2"
      style={{ background: 'rgba(74,85,104,0.07)', borderRadius: '0.75rem', border: '1px dashed #1A2840' }}>
      <Info size={16} className="text-[#4A5568]" strokeWidth={1.5} />
      <p className="text-xs text-[#4A5568] text-center leading-snug">
        {detail || `Données non disponibles pour ${year}`}
      </p>
    </div>
  )
}

export default function Consommation() {
  const { year } = useEdition()
  const d    = IS_DEMO ? CONSO[year]     : null
  const prev = IS_DEMO ? CONSO[year - 1] : null

  const delta_ca    = d && prev ? fmt.delta(d.ca,      prev.ca)      : null
  const delta_cli   = d && prev ? fmt.delta(d.clients, prev.clients) : null
  const delta_transac = d && prev ? fmt.delta(d.transactions, prev.transactions) : null
  const delta_panier  = d && prev ? fmt.delta(d.panier, prev.panier) : null

  const pic = CA_HORAIRE_2025.reduce((a, b) => b.ca > a.ca ? b : a)

  return (
    <div className="space-y-6 animate-slide-up">

      {/* Bandeau source */}
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
        style={{ background: 'rgba(6,142,234,0.07)', border: '1px solid rgba(6,142,234,0.15)' }}>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#068EEA' }} />
        <p className="text-xs text-[#8B9BB4]">
          Édition <span className="text-white font-semibold">{year}</span>
          {d ? ` — Source : ${d.plateforme}` : ' — Données de consommation non disponibles pour cette édition'}
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="CA Consommation"   value={d ? fmt.currency(d.ca)           : '—'} sub={d ? 'Hors frais & consignes' : `Indisponible ${year}`} delta={delta_ca}      accent="blue"   icon={Euro}         />
        <KpiCard label="Clients acheteurs" value={d ? fmt.number(d.clients)        : '—'} sub="Clients uniques"                                       delta={delta_cli}     accent="teal"   icon={Users}        />
        <KpiCard label="Transactions"      value={d ? fmt.number(d.transactions)   : '—'} sub="Uniques"                                               delta={delta_transac} accent="gold"   icon={ShoppingCart} />
        <KpiCard label="Panier moyen"      value={d ? fmt.currency(d.panier)       : '—'} sub="CA HT / client"                                        delta={delta_panier}  accent="violet" icon={Star}         />
      </div>

      {/* CA horaire + PDV */}
      <div className="grid xl:grid-cols-3 gap-4">
        <SectionCard title="CA horaire bars"
          subtitle={year === 2025 ? `Pic à ${pic.h} · ${fmt.currency(pic.ca)}` : `Disponible uniquement pour 2025`}>
          {year === 2025 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={CA_HORAIRE_2025}>
                <defs>
                  <linearGradient id="gradH" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#068EEA" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#068EEA" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1A2840" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="h" tick={{ fill: '#8B9BB4', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8B9BB4', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v/1000).toFixed(0)}k`} width={28} />
                <Tooltip content={<Tip />} />
                <Area type="monotone" dataKey="ca" name="CA HT" stroke="#068EEA" strokeWidth={2}
                  fill="url(#gradH)" dot={false} activeDot={{ r: 4, fill: '#068EEA' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <NoData year={year} detail="CA horaire disponible uniquement en 2025 (enrichissement Weezpay)" />
          )}
        </SectionCard>

        <SectionCard title={`CA par point de vente — ${year}`} subtitle="Top 6 zones · hors frais" className="xl:col-span-2">
          {d?.pdv ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={d.pdv} layout="vertical" barSize={14} margin={{ left: 0, right: 8 }}>
                <CartesianGrid horizontal={false} stroke="#1A2840" strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fill: '#8B9BB4', fontSize: 9 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v/1000).toFixed(0)}k€`} />
                <YAxis type="category" dataKey="short" tick={{ fill: '#8B9BB4', fontSize: 10 }} axisLine={false}
                  tickLine={false} width={72} />
                <Tooltip content={<Tip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="ca" name="CA HT" radius={[0, 4, 4, 0]}>
                  {d.pdv.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#F59E0B' : i < 3 ? '#068EEA' : '#2A3850'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <NoData year={year} detail="Détail PDV non disponible pour cette édition" />}
        </SectionCard>
      </div>

      {/* Familles comparatif + Top articles */}
      <div className="grid xl:grid-cols-2 gap-4">

        <SectionCard title="CA par famille produit" subtitle="Comparatif 2023 · 2024 · 2025">
          <div className="space-y-3">
            {(() => {
              const allNames = [...new Set([2023,2024,2025].flatMap(y => (CONSO[y]?.familles ?? []).map(f => f.name)))]
              const getCA = (yr, name) => CONSO[yr]?.familles?.find(f => f.name === name)?.ca ?? 0
              const getColor = name => CONSO[2025]?.familles?.find(f=>f.name===name)?.color ?? CONSO[2024]?.familles?.find(f=>f.name===name)?.color ?? '#4A5568'
              return allNames.slice(0, 7).map(name => {
                const c23 = getCA(2023, name), c24 = getCA(2024, name), c25 = getCA(2025, name)
                const max = Math.max(c23, c24, c25)
                if (max === 0) return null
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: getColor(name) }} />
                        <p className="text-xs font-medium text-[#8B9BB4]">{name}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {[{y:2023,v:c23,c:'#4A5568'},{y:2024,v:c24,c:'#068EEA'},{y:2025,v:c25,c:getColor(name)}].map(({y,v,c})=>(
                          <p key={y} className="num text-2xs font-semibold w-16 text-right"
                            style={{ color: y===year ? '#F0F4FF' : c }}>{v ? fmt.currency(v) : '—'}</p>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {[{v:c23,c:'#4A5568'},{v:c24,c:'#068EEA'},{v:c25,c:getColor(name)}].map(({v,c},i)=>(
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
            {[{y:'2023',c:'#4A5568'},{y:'2024',c:'#068EEA'},{y:'2025',c:'#F59E0B'}].map(({y,c})=>(
              <span key={y} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{background:c}} />{y}</span>
            ))}
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title={`Top articles — volume ${year}`}>
            {year === 2025 ? (
              <div className="space-y-2">
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
                          style={{ width: `${(qty/TOP_ARTICLES_2025[0].qty)*100}%`, background: i===0 ? '#F59E0B' : '#068EEA' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <NoData year={year} detail="Détail articles disponible uniquement pour 2025" />}
          </SectionCard>

          <SectionCard title="Évolution globale 2023 → 2025">
            <div className="grid grid-cols-3 gap-3">
              {OVERVIEW.filter(d => d.ca_conso).map(d => (
                <div key={d.year} className="text-center p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${d.year===year ? 'rgba(245,158,11,0.2)' : '#1A2840'}` }}>
                  <p className="text-2xs uppercase tracking-wider mb-1.5"
                    style={{ color: d.year===year ? '#F59E0B' : d.year===2024 ? '#068EEA' : '#4A5568' }}>
                    {d.year}{d.year===year && ' ✦'}
                  </p>
                  <p className="num text-sm font-bold text-white">{fmt.currency(d.ca_conso)}</p>
                  <div className="mt-2 space-y-0.5">
                    <p className="num text-2xs text-[#8B9BB4]">{fmt.number(d.clients)} clients</p>
                    <p className="num text-2xs text-[#8B9BB4]">{fmt.currency(d.panier)} panier</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

    </div>
  )
}
