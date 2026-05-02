import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import { Users, TrendingUp, ShoppingBag } from 'lucide-react'
import KpiCard    from '../components/ui/KpiCard'
import SectionCard from '../components/ui/SectionCard'
import EmptyState  from '../components/ui/EmptyState'
import { fmt }    from '../lib/format'
import { useEdition } from '../context/EditionContext'

// ── Données par année ─────────────────────────────────────────────────────────
// Structure : DATA_BY_YEAR[year] = { genre, tranches, comportement, prefs, heures, source }
// Ajouter une nouvelle année ici dès que les données sont disponibles.

const DATA_BY_YEAR = {
  2025: {
    source:    'Formulaire participant 2025 — 3 299 réponses',
    genre: [
      { name: 'Femme', pct: 50.8, n: 1677, color: '#8B5CF6' },
      { name: 'Homme', pct: 42.8, n: 1413, color: '#068EEA' },
      { name: 'Autre', pct: 6.3,  n: 209,  color: '#4A5568' },
    ],
    tranches: [
      { age: '18–20', pct: 16.8, n: 362,  color: '#06B6D4' },
      { age: '21–30', pct: 45.2, n: 975,  color: '#068EEA' },
      { age: '31–40', pct: 25.2, n: 542,  color: '#8B5CF6' },
      { age: '41–50', pct: 6.8,  n: 147,  color: '#F59E0B' },
      { age: '51+',   pct: 6.0,  n: 129,  color: '#F97316' },
    ],
    comportement: [
      { age: '18–20', ca: 11427, clients: 1222, panier: 9.3  },
      { age: '21–30', ca: 43104, clients: 3931, panier: 11.0 },
      { age: '31–40', ca: 35430, clients: 2637, panier: 13.4 },
      { age: '41–50', ca: 7521,  clients: 675,  panier: 11.1 },
      { age: '51+',   ca: 6505,  clients: 597,  panier: 10.9 },
    ],
    prefs: [
      { cat: 'Champagne', j18: 28, j21: 42, j31: 38, j41: 45, j51: 52 },
      { cat: 'Cocktail',  j18: 35, j21: 25, j31: 18, j41: 12, j51: 8  },
      { cat: 'Bières',    j18: 22, j21: 18, j31: 22, j41: 25, j51: 20 },
      { cat: 'Soft',      j18: 15, j21: 15, j31: 22, j41: 18, j51: 20 },
    ],
    heures: [
      { h: '17h', j18: 8,  j21: 12, j31: 10 },
      { h: '18h', j18: 15, j21: 18, j31: 14 },
      { h: '19h', j18: 28, j21: 30, j31: 25 },
      { h: '20h', j18: 22, j21: 20, j31: 22 },
      { h: '21h', j18: 18, j21: 12, j31: 18 },
      { h: '22h', j18: 9,  j21: 8,  j31: 11 },
    ],
  },
  // 2024: { ... }  ← à renseigner quand les données seront disponibles
  // 2023: { ... }
}

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2.5 text-xs" style={{ background: '#111D33', border: '1px solid #1A2840' }}>
      <p className="font-semibold text-[#8B9BB4] uppercase tracking-wider mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="num font-semibold" style={{ color: p.color }}>{p.name}: {p.value}%</p>
      ))}
    </div>
  )
}

export default function ProfilClient() {
  const { year } = useEdition()
  const data = DATA_BY_YEAR[year]

  if (!data) {
    return (
      <div className="space-y-4 animate-slide-up">
        <EmptyState
          year={year}
          module="Profil Client"
          message={`Aucune donnée Profil Client disponible pour l'édition ${year}.`}
          hint="Le profil client est alimenté par le formulaire participant et les données de consommation. Les données démographiques sont disponibles pour l'édition 2025."
        />
      </div>
    )
  }

  const { genre: GENRE, tranches: TRANCHES, comportement: COMPORTEMENT, prefs: PREFS, heures: HEURES, source } = data
  const dominant  = TRANCHES.reduce((a, b) => b.pct > a.pct ? b : a)
  const maxPanier = COMPORTEMENT.reduce((a, b) => b.panier > a.panier ? b : a)

  return (
    <div className="space-y-6 animate-slide-up">

      {/* Note source */}
      <div className="p-3 rounded-xl flex items-start gap-3"
        style={{ background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.15)' }}>
        <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#06B6D4' }} />
        <p className="text-xs text-[#8B9BB4]">
          Source : <span className="text-white font-semibold">{source}</span>.
          Données démographiques disponibles pour l'édition {year}.
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Profils renseignés"  value={fmt.number(3299)}          sub="Formulaire 2025"           delta={null} accent="blue"   icon={Users}      />
        <KpiCard label="Tranche dominante"   value={dominant.age}               sub={`${dominant.pct}% des profils`} delta={null} accent="teal"   icon={TrendingUp} />
        <KpiCard label="Panier max / tranche" value={`${maxPanier.panier} €`}   sub={`${maxPanier.age} ans (/ transac.)`} delta={null} accent="gold"   icon={ShoppingBag}/>
        <KpiCard label="Part féminine"       value="50.8%"                      sub="1 677 femmes / 1 413 hommes" delta={null} accent="violet" icon={Users}      />
      </div>

      {/* Genre + Tranches en % */}
      <div className="grid xl:grid-cols-3 gap-4">

        {/* Donut genre */}
        <SectionCard title="Répartition par genre" subtitle="3 299 formulaires · 2025">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={GENRE} dataKey="pct" cx="50%" cy="50%"
                innerRadius={48} outerRadius={70} paddingAngle={3} strokeWidth={0}>
                {GENRE.map(d => <Cell key={d.name} fill={d.color} />)}
              </Pie>
              <Tooltip
                formatter={v => `${v}%`}
                contentStyle={{ background: '#111D33', border: '1px solid #1A2840', borderRadius: '0.75rem' }}
                itemStyle={{ color: '#F0F4FF', fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            {GENRE.map(d => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  <p className="text-xs text-[#8B9BB4]">{d.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-1.5 rounded-full" style={{ background: '#1A2840' }}>
                    <div className="h-full rounded-full" style={{ width: `${d.pct}%`, background: d.color }} />
                  </div>
                  <p className="num text-xs font-semibold text-white w-8 text-right">{d.pct}%</p>
                  <p className="num text-2xs text-[#4A5568] w-10 text-right">{fmt.number(d.n)}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Tranches en % */}
        <SectionCard title="Répartition par tranche d'âge" subtitle="% des profils renseignés" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={TRANCHES} barSize={32} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke="#1A2840" strokeDasharray="3 3" />
              <XAxis dataKey="age" tick={{ fill: '#8B9BB4', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8B9BB4', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${v}%`} width={28} domain={[0, 55]} />
              <Tooltip
                formatter={(v, n, p) => [`${v}% · ${fmt.number(p.payload.n)} profils`, 'Part']}
                contentStyle={{ background: '#111D33', border: '1px solid #1A2840', borderRadius: '0.75rem' }}
                itemStyle={{ color: '#F0F4FF', fontSize: 12 }}
              />
              <Bar dataKey="pct" name="% des profils" radius={[4, 4, 0, 0]}>
                {TRANCHES.map(d => <Cell key={d.age} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-5 gap-2 mt-2">
            {TRANCHES.map(d => (
              <div key={d.age} className="text-center p-2 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${d.color}25` }}>
                <p className="text-2xs font-semibold mb-0.5" style={{ color: d.color }}>{d.age}</p>
                <p className="num text-lg font-bold text-white">{d.pct}%</p>
                <p className="num text-2xs text-[#4A5568]">{fmt.number(d.n)}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Comportement + Préférences */}
      <div className="grid xl:grid-cols-2 gap-4">

        {/* Comportement d'achat (CA et panier) */}
        <SectionCard title="Comportement d'achat par tranche" subtitle="CA et panier moyen / transaction · BDD 2025">
          <div className="space-y-3">
            {COMPORTEMENT.map(({ age, ca, clients, panier }) => {
              const t = TRANCHES.find(x => x.age === age)
              const maxCA = Math.max(...COMPORTEMENT.map(x => x.ca))
              return (
                <div key={age} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1A2840' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: t?.color }} />
                      <p className="text-xs font-semibold text-white">{age} ans</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="num text-xs font-bold text-white">{fmt.currency(ca)}</p>
                        <p className="text-2xs text-[#4A5568]">CA total</p>
                      </div>
                      <div className="text-right">
                        <p className="num text-xs font-bold" style={{ color: t?.color }}>{fmt.currency(panier)}</p>
                        <p className="text-2xs text-[#4A5568]">/ transac.</p>
                      </div>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: '#1A2840' }}>
                    <div className="h-full rounded-full" style={{ width: `${(ca/maxCA)*100}%`, background: t?.color }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-3 p-3 rounded-xl" style={{ background: 'rgba(6,142,234,0.07)', border: '1px solid rgba(6,142,234,0.15)' }}>
            <p className="text-xs text-[#8B9BB4]">
              Les <span className="text-[#8B5CF6] font-semibold">31–40 ans</span> ont le panier moyen le plus élevé ({fmt.currency(13.4)}/transaction).
              Les <span className="text-[#068EEA] font-semibold">21–30 ans</span> génèrent le CA total le plus important par volume.
            </p>
          </div>
        </SectionCard>

        {/* Préférences produit par âge */}
        <SectionCard title="Préférences produit par tranche" subtitle="% des achats par catégorie · 2025">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={PREFS} barSize={9} barCategoryGap="25%">
              <CartesianGrid vertical={false} stroke="#1A2840" strokeDasharray="3 3" />
              <XAxis dataKey="cat" tick={{ fill: '#8B9BB4', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8B9BB4', fontSize: 9 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${v}%`} width={28} />
              <Tooltip content={<Tip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="j18" name="18–20" fill="#06B6D4"  radius={[3,3,0,0]} />
              <Bar dataKey="j21" name="21–30" fill="#068EEA"  radius={[3,3,0,0]} />
              <Bar dataKey="j31" name="31–40" fill="#8B5CF6"  radius={[3,3,0,0]} />
              <Bar dataKey="j41" name="41–50" fill="#F59E0B"  radius={[3,3,0,0]} />
              <Bar dataKey="j51" name="51+"   fill="#F97316"  radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-1">
            {TRANCHES.map(d => (
              <span key={d.age} className="flex items-center gap-1.5 text-2xs text-[#8B9BB4]">
                <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />{d.age}
              </span>
            ))}
          </div>
          <div className="mt-3 space-y-1.5">
            {[
              { text: 'Champagne : préférence croissante avec l\'âge (28% → 52%)', color: '#F59E0B' },
              { text: 'Cocktail : domaine des 18–20 ans (35%) — déclin net avec l\'âge', color: '#8B5CF6' },
              { text: 'Les 51+ : profil premium, 52% Champagne', color: '#F97316' },
            ].map(({ text, color }) => (
              <div key={text} className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
                <p className="text-2xs text-[#8B9BB4] leading-snug">{text}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

    </div>
  )
}
