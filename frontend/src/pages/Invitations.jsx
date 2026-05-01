import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import { Gift, Euro, Users, TrendingDown } from 'lucide-react'
import KpiCard from '../components/ui/KpiCard'
import SectionCard from '../components/ui/SectionCard'
import { fmt } from '../lib/format'

// ── Données réelles — source BDD Weezpay 2025 ─────────────────────────────────
// CA invités calculé directement par filtre "Tarif billets CONTAINS INVITATION"
const CA_REEL_INVITES   = 91955
const PANIER_INVITES    = 79.61   // panier moyen réel invités
const PANIER_PAYANTS    = 58.19   // panier moyen réel payants
const VALEUR_INVIT      = 421510  // source CSE × partenaire détails (valeur marché)
const ENTREES_INVIT     = 5240
const TOTAL_ENTREES     = 16810
const TOTAL_BILLETS     = 1570
const CLIENTS_INVITES   = 1155    // clients invités ayant effectivement consommé
const PERTES_NETTES     = VALEUR_INVIT - CA_REEL_INVITES

const RATIO_RENTABILITE = ((CA_REEL_INVITES / VALEUR_INVIT) * 100).toFixed(1)
const RETOUR_PAR_EURO   = (CA_REEL_INVITES / VALEUR_INVIT).toFixed(2)

const TOP_INVITEURS = [
  { contact: 'Contact VIP 1',       qty: 200, valeur: 48000  },
  { contact: 'Partenaire A',        qty: 142, valeur: 36920  },
  { contact: 'Partenaire Food',     qty: 220, valeur: 35100  },
  { contact: 'Contact 2',           qty: 125, valeur: 15000  },
  { contact: 'Partenaire Média',    qty: 117, valeur: 16760  },
  { contact: 'Contact 3',           qty: 70,  valeur: 8400   },
  { contact: 'Contact 4',           qty: 70,  valeur: 10800  },
  { contact: 'Partenaire Boisson',  qty: 50,  valeur: 10800  },
  { contact: 'Partenaire Transport',qty: 50,  valeur: 7600   },
  { contact: 'Partenaire B',        qty: 50,  valeur: 14000  },
]

const CA_PDV_INVITES = [
  { pdv: 'Bar Zone VIP',       ca: 30634 },
  { pdv: 'Bar Zone Nord',      ca: 14125 },
  { pdv: 'Bar Zone Sud',       ca: 7185  },
  { pdv: 'Bar VIP Int.',       ca: 6001  },
  { pdv: 'Bar Partenaire A',   ca: 5296  },
  { pdv: 'Bar Zone Centrale',  ca: 4482  },
]

const CA_FAM_INVITES = [
  { name: 'Champagne',   ca: 40336, color: '#F59E0B' },
  { name: 'Bières',      ca: 7104,  color: '#068EEA' },
  { name: 'Hard',        ca: 5952,  color: '#EF4444' },
  { name: 'Soft',        ca: 5844,  color: '#06B6D4' },
  { name: 'Bar Cocktail',ca: 5296,  color: '#8B5CF6' },
  { name: 'Cocktail',    ca: 4348,  color: '#F97316' },
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

export default function Invitations() {
  const pctInvit = ((ENTREES_INVIT / TOTAL_ENTREES) * 100).toFixed(1)

  return (
    <div className="space-y-6 animate-slide-up">

      {/* KPI */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Billets distribués"   value={fmt.number(TOTAL_BILLETS)}    sub="Invitations 2025"            delta={null}  accent="gold"   icon={Gift}         />
        <KpiCard label="Valeur économique"    value={fmt.currency(VALEUR_INVIT)}   sub="Coût d'opportunité réel"     delta={null}  accent="violet" icon={Euro}         />
        <KpiCard label="Entrées réelles"      value={fmt.number(ENTREES_INVIT)}    sub={`${pctInvit}% fréquentation`} delta={null}  accent="teal"   icon={Users}        />
        <KpiCard label="CA conso généré"      value={fmt.currency(CA_REEL_INVITES)} sub={`Source BDD · ${CLIENTS_INVITES} clients`} delta={null} accent="coral" icon={TrendingDown} />
      </div>

      {/* Bilan rentabilité */}
      <div className="grid xl:grid-cols-3 gap-4">

        {/* Analyse rentabilité */}
        <SectionCard title="Rentabilité des invitations" subtitle="Source données réelles BDD 2025" className="xl:col-span-2">
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: 'Valeur billets offerts',   value: fmt.currency(VALEUR_INVIT),       color: '#EF4444', sub: 'Coût d\'opportunité billetterie' },
              { label: 'CA consommation réel',     value: fmt.currency(CA_REEL_INVITES),    color: '#10B981', sub: `${CLIENTS_INVITES} clients invités actifs` },
              { label: 'Perte nette estimée',      value: fmt.currency(PERTES_NETTES),      color: '#F59E0B', sub: 'Valeur − CA conso' },
            ].map(({ label, value, color, sub }) => (
              <div key={label} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${color}25` }}>
                <p className="text-2xs text-[#8B9BB4] mb-2 leading-snug">{label}</p>
                <p className="num text-xl font-bold" style={{ color }}>{value}</p>
                <p className="text-2xs text-[#4A5568] mt-1">{sub}</p>
              </div>
            ))}
          </div>

          {/* Barre rentabilité */}
          <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1A2840' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white">Taux de retour sur invitation</p>
              <p className="num text-xl font-bold text-[#EF4444]">{RATIO_RENTABILITE}%</p>
            </div>
            <div className="h-3 rounded-full relative" style={{ background: '#1A2840' }}>
              <div className="h-full rounded-full" style={{
                width: `${RATIO_RENTABILITE}%`,
                background: 'linear-gradient(90deg, #EF4444, #F59E0B)'
              }} />
              <div className="absolute top-0 h-full w-0.5" style={{ left: '100%', background: '#10B981' }} />
            </div>
            <div className="flex justify-between mt-1.5">
              <p className="text-2xs text-[#4A5568]">0%</p>
              <p className="text-2xs text-[#10B981]">Seuil d'équilibre : 100%</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <p className="text-2xs text-[#8B9BB4] mb-1">Pour 1 € de billet offert</p>
                <p className="num text-lg font-bold text-[#EF4444]">{RETOUR_PAR_EURO} €</p>
                <p className="text-2xs text-[#4A5568]">de CA conso généré</p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <p className="text-2xs text-[#8B9BB4] mb-1">Panier invités vs payants</p>
                <p className="num text-lg font-bold text-[#F59E0B]">{fmt.currency(PANIER_INVITES)}</p>
                <p className="text-2xs text-[#4A5568]">vs {fmt.currency(PANIER_PAYANTS)} payants (+{((PANIER_INVITES/PANIER_PAYANTS-1)*100).toFixed(0)}%)</p>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Fréquentation payants vs invités */}
        <SectionCard title="Festivaliers par statut" subtitle="Sur 16 810 entrées 2025">
          <div className="flex justify-center py-3">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1A2840" strokeWidth="3.5" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#068EEA" strokeWidth="3.5"
                  strokeDasharray={`${((TOTAL_ENTREES - ENTREES_INVIT) / TOTAL_ENTREES * 100).toFixed(1)} 100`} />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F59E0B" strokeWidth="3.5"
                  strokeDasharray={`${(ENTREES_INVIT / TOTAL_ENTREES * 100).toFixed(1)} 100`}
                  strokeDashoffset={`-${((TOTAL_ENTREES - ENTREES_INVIT) / TOTAL_ENTREES * 100).toFixed(1)}`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="num text-xl font-bold text-white">{pctInvit}%</p>
                <p className="text-2xs text-[#8B9BB4]">Invités</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Billets payants',  v: TOTAL_ENTREES - ENTREES_INVIT, c: '#068EEA', pct: ((TOTAL_ENTREES-ENTREES_INVIT)/TOTAL_ENTREES*100).toFixed(1) },
              { label: 'Invitations',      v: ENTREES_INVIT,                 c: '#F59E0B', pct: pctInvit },
            ].map(({ label, v, c, pct }) => (
              <div key={label} className="flex items-center justify-between p-2.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1A2840' }}>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                  <p className="text-xs text-[#8B9BB4]">{label}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="num text-xs font-semibold text-white">{fmt.number(v)}</p>
                  <p className="num text-xs font-semibold" style={{ color: c }}>{pct}%</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <p className="text-xs text-[#8B9BB4]">
              Seuls <span className="text-white font-semibold">{fmt.number(CLIENTS_INVITES)}</span> des <span className="text-white font-semibold">{fmt.number(ENTREES_INVIT)}</span> invités ont consommé
              — taux d'activation <span className="text-[#F59E0B] font-semibold">{((CLIENTS_INVITES/ENTREES_INVIT)*100).toFixed(0)}%</span>.
            </p>
          </div>
        </SectionCard>
      </div>

      {/* CA invités par PDV + Top contacts */}
      <div className="grid xl:grid-cols-2 gap-4">

        <div className="space-y-4">
          {/* CA par PDV invités */}
          <SectionCard title="CA invités par point de vente" subtitle="Source directe BDD · filtre INVITATION">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={CA_PDV_INVITES} layout="vertical" barSize={12} margin={{ left: 0, right: 8 }}>
                <CartesianGrid horizontal={false} stroke="#1A2840" strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fill: '#8B9BB4', fontSize: 9 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v/1000).toFixed(0)}k€`} />
                <YAxis type="category" dataKey="pdv" tick={{ fill: '#8B9BB4', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<Tip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="ca" name="CA HT (€)" radius={[0, 4, 4, 0]}>
                  {CA_PDV_INVITES.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#F59E0B' : '#2A3850'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-2xs text-[#4A5568] mt-1">
              La Zone VIP concentre <span className="text-white font-semibold">{((30634/CA_REEL_INVITES)*100).toFixed(0)}%</span> du CA conso invités.
            </p>
          </SectionCard>

          {/* CA par famille */}
          <SectionCard title="Consommation invités par famille" subtitle="Répartition CA réel 2025">
            <div className="space-y-2">
              {CA_FAM_INVITES.map(({ name, ca, color }) => (
                <div key={name}>
                  <div className="flex justify-between mb-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                      <p className="text-xs text-[#8B9BB4]">{name}</p>
                    </div>
                    <p className="num text-xs font-semibold text-white">{fmt.currency(ca)}</p>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: '#1A2840' }}>
                    <div className="h-full rounded-full" style={{ width: `${(ca/CA_FAM_INVITES[0].ca)*100}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-2xs text-[#4A5568] mt-2">
              Le Champagne représente <span className="text-[#F59E0B] font-semibold">{((40336/CA_REEL_INVITES)*100).toFixed(0)}%</span> du CA invités.
              Profil de consommation premium.
            </p>
          </SectionCard>
        </div>

        {/* Top contacts inviteurs */}
        <SectionCard title="Top contacts inviteurs 2025" subtitle="Billets distribués et valeur économique">
          <div>
            <div className="grid grid-cols-12 gap-2 px-2 pb-2 border-b border-[#1A2840]">
              <p className="col-span-5 text-2xs font-semibold text-[#4A5568] uppercase tracking-wider">Contact</p>
              <p className="col-span-3 text-2xs font-semibold text-[#4A5568] uppercase tracking-wider text-right">Billets</p>
              <p className="col-span-4 text-2xs font-semibold text-[#4A5568] uppercase tracking-wider text-right">Valeur</p>
            </div>
            {TOP_INVITEURS.map((r, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 px-2 py-2 border-b border-[#1A2840]/40 last:border-0 hover:bg-[#111D33]/40 rounded transition-colors">
                <p className="col-span-5 text-xs text-[#8B9BB4] truncate self-center">{r.contact}</p>
                <p className="col-span-3 num text-xs font-semibold text-white text-right self-center">{fmt.number(r.qty)}</p>
                <p className="col-span-4 num text-xs font-semibold text-white text-right self-center">{fmt.currency(r.valeur)}</p>
              </div>
            ))}
            <div className="grid grid-cols-12 gap-2 px-2 pt-2 mt-1 border-t-2 border-[#1A2840]">
              <p className="col-span-5 text-xs font-bold text-white">Total (tous contacts)</p>
              <p className="col-span-3 num text-xs font-bold text-white text-right">{fmt.number(TOTAL_BILLETS)}</p>
              <p className="col-span-4 num text-xs font-bold text-white text-right">{fmt.currency(VALEUR_INVIT)}</p>
            </div>
          </div>
        </SectionCard>
      </div>

    </div>
  )
}
