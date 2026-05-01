import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList
} from 'recharts'
import { fmt } from '../lib/format'

const MONTH_FR = {
  '01':'Jan','02':'Fév','03':'Mar','04':'Avr','05':'Mai','06':'Jun',
  '07':'Jul','08':'Aoû','09':'Sep','10':'Oct','11':'Nov','12':'Déc',
}

function TipJauge({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 rounded-xl text-xs" style={{ background: '#111D33', border: '1px solid #1A2840' }}>
      <p className="font-semibold mb-1" style={{ color: '#8B9BB4' }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} className="num" style={{ color: p.fill }}>
          {p.name}: {fmt.number(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function BilletterieComposition({ kpisAvances, previousYearTotal }) {
  const [monthFilter, setMonthFilter] = useState(null)  // null = tous les mois

  if (!kpisAvances) return null

  const ct = kpisAvances.composition_tickets ?? {}
  const cj = kpisAvances.composition_jauge   ?? []
  const cm = kpisAvances.commandes_multi     ?? {}
  const mc = kpisAvances.moyennes_client     ?? {}

  // Extraire les mois disponibles dans la jauge
  const availableMonths = useMemo(() => {
    const months = new Set()
    cj.forEach(d => {
      if (d.jour) months.add(d.jour.slice(0, 7))  // YYYY-MM
    })
    return [...months].sort()
  }, [cj])

  // Filtrer par mois si sélectionné
  const filteredJauge = useMemo(() => {
    if (!monthFilter) return cj
    return cj.filter(d => d.jour?.startsWith(monthFilter))
  }, [cj, monthFilter])

  const pctVsAn = previousYearTotal && ct.total
    ? ((ct.total - previousYearTotal) / previousYearTotal * 100).toFixed(1)
    : null

  return (
    <div className="space-y-4">

      {/* ── Composition tickets ─────────────────────────────── */}
      <div className="p-4 rounded-2xl" style={{ background: '#0D1526', border: '1px solid #1A2840' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#8B9BB4' }}>
          Composition des billets vendus
        </p>
        <div className="flex items-baseline gap-3 mb-4">
          <span className="num text-4xl font-bold" style={{ color: '#F0F4FF' }}>
            {fmt.number(ct.total ?? 0)}
          </span>
          <span className="text-sm" style={{ color: '#8B9BB4' }}>billets</span>
          {pctVsAn !== null && (
            <span className="text-sm font-semibold" style={{ color: Number(pctVsAn) >= 0 ? '#10B981' : '#EF4444' }}>
              {Number(pctVsAn) >= 0 ? '+' : ''}{pctVsAn}% vs an passé
            </span>
          )}
        </div>

        {/* Barres de répartition */}
        {(() => {
          const total = ct.total || 1
          const rows = [
            { label: 'Zone premium / VIP',   val: ct.vip_payant ?? 0,           color: '#F59E0B' },
            { label: 'Zone standard',         val: ct.standard_payant ?? 0,      color: '#068EEA' },
            { label: 'Invitation standard',   val: ct.invitation_standard ?? 0,  color: '#8B9BB4' },
            { label: 'Invitation VIP',        val: ct.invitation_vip ?? 0,       color: '#8B5CF6' },
          ].filter(r => r.val > 0)

          return (
            <div className="space-y-2">
              {rows.map(({ label, val, color }) => {
                const pct = (val / total * 100)
                return (
                  <div key={label}>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-xs" style={{ color: '#8B9BB4' }}>{label}</span>
                      <div className="flex items-center gap-2">
                        <span className="num text-xs font-semibold" style={{ color }}>{fmt.number(val)}</span>
                        <span className="text-xs" style={{ color: '#4A5568' }}>{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: '#1A2840' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>

      {/* ── Jauge participants par jour — histogramme ────────── */}
      {cj.length > 0 && (
        <div className="p-4 rounded-2xl" style={{ background: '#0D1526', border: '1px solid #1A2840' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#8B9BB4' }}>
              Participants par jour
            </p>
            <div className="flex items-center gap-3">
              {/* Légende */}
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#F59E0B' }} />
                  <span style={{ color: '#8B9BB4' }}>VIP</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#068EEA' }} />
                  <span style={{ color: '#8B9BB4' }}>Standard</span>
                </span>
              </div>
            </div>
          </div>

          {/* Filtres par mois (si > 31 jours) */}
          {availableMonths.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              <button
                onClick={() => setMonthFilter(null)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium transition"
                style={{
                  background: !monthFilter ? 'rgba(6,142,234,0.15)' : '#111D33',
                  color: !monthFilter ? '#21AAFA' : '#8B9BB4',
                  border: `1px solid ${!monthFilter ? 'rgba(6,142,234,0.3)' : '#1A2840'}`,
                }}>
                Tous
              </button>
              {availableMonths.map(m => {
                const [yr, mo] = m.split('-')
                const label = `${MONTH_FR[mo] ?? mo} ${yr}`
                return (
                  <button key={m}
                    onClick={() => setMonthFilter(m)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium transition"
                    style={{
                      background: monthFilter === m ? 'rgba(6,142,234,0.15)' : '#111D33',
                      color: monthFilter === m ? '#21AAFA' : '#8B9BB4',
                      border: `1px solid ${monthFilter === m ? 'rgba(6,142,234,0.3)' : '#1A2840'}`,
                    }}>
                    {label}
                  </button>
                )
              })}
            </div>
          )}

          {/* Histogramme */}
          {filteredJauge.length > 0 ? (
            <ResponsiveContainer width="100%" height={filteredJauge.length > 15 ? 220 : Math.max(120, filteredJauge.length * 36)}>
              <BarChart
                data={filteredJauge}
                layout="vertical"
                margin={{ top: 0, right: 40, left: 80, bottom: 0 }}
                barSize={14}
              >
                <CartesianGrid horizontal={false} stroke="#1A2840" strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fill: '#8B9BB4', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fill: '#8B9BB4', fontSize: 9 }}
                  axisLine={false} tickLine={false}
                  width={76}
                  tickFormatter={v => v?.length > 12 ? v.slice(0, 12) + '…' : v}
                />
                <Tooltip content={<TipJauge />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="standard" name="Standard" stackId="a" fill="#068EEA" radius={[0,0,0,0]} />
                <Bar dataKey="vip"      name="VIP"      stackId="a" fill="#F59E0B" radius={[0,4,4,0]}>
                  <LabelList
                    dataKey="total"
                    position="right"
                    style={{ fill: '#8B9BB4', fontSize: 9 }}
                    formatter={v => fmt.number(v)}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-center py-4" style={{ color: '#4A5568' }}>
              Aucune donnée pour ce mois.
            </p>
          )}
        </div>
      )}

      {/* ── KPIs comportementaux ─────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Commandes ≥ 2 billets', val: fmt.number(cm.multi ?? 0),      sub: `${cm.pct_multi ?? 0}% des commandes`, color: '#8B5CF6' },
          { label: 'Tickets / client',       val: mc.tickets_par_client != null ? mc.tickets_par_client.toFixed(1) : '—', sub: 'moyenne', color: '#06B6D4' },
          { label: 'CA / client',            val: mc.montant_par_client  != null ? fmt.currency(mc.montant_par_client) : '—', sub: 'montant moyen', color: '#F59E0B' },
          { label: 'Commandes simples',      val: fmt.number(cm.single ?? 0),     sub: `${cm.total ? (100-(cm.pct_multi??0)).toFixed(1) : 0}% des commandes`, color: '#8B9BB4' },
        ].map(({ label, val, sub, color }) => (
          <div key={label} className="p-3 rounded-xl" style={{ background: '#0D1526', border: '1px solid #1A2840' }}>
            <p className="uppercase tracking-wider mb-1" style={{ color: '#4A5568', fontSize: '0.575rem' }}>{label}</p>
            <p className="num text-xl font-bold" style={{ color }}>{val}</p>
            <p className="text-xs mt-0.5" style={{ color: '#4A5568' }}>{sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
