import { fmt } from '../lib/format'

export default function BilletterieComposition({ kpisAvances, previousYearTotal }) {
  if (!kpisAvances) return null

  const ct = kpisAvances.composition_tickets ?? {}
  const cj = kpisAvances.composition_jauge   ?? []
  const cm = kpisAvances.commandes_multi     ?? {}
  const mc = kpisAvances.moyennes_client     ?? {}

  const pctVsAn = previousYearTotal && ct.total
    ? ((ct.total - previousYearTotal) / previousYearTotal * 100).toFixed(1)
    : null

  return (
    <div className="space-y-4">

      {/* Composition tickets */}
      <div className="p-4 rounded-2xl" style={{ background: '#0D1526', border: '1px solid #1A2840' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#8B9BB4' }}>
          Nombre de tickets vendus
        </p>
        <div className="flex items-baseline gap-3 mb-4">
          <span className="num text-4xl font-bold" style={{ color: '#F0F4FF' }}>{fmt.number(ct.total ?? 0)}</span>
          {pctVsAn !== null && (
            <span className="text-sm font-semibold" style={{ color: Number(pctVsAn) >= 0 ? '#10B981' : '#EF4444' }}>
              {Number(pctVsAn) >= 0 ? '+' : ''}{pctVsAn}%
            </span>
          )}
        </div>
        <div className="space-y-2">
          {[
            { label: 'Zone premium / VIP',    val: ct.vip_payant ?? 0,           color: '#F59E0B' },
            { label: 'Zone standard',          val: ct.standard_payant ?? 0,      color: '#068EEA' },
            { label: 'Invitation standard',    val: ct.invitation_standard ?? 0,  color: '#8B9BB4' },
            { label: 'Invitation VIP',         val: ct.invitation_vip ?? 0,       color: '#8B5CF6' },
          ].map(({ label, val, color }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm" style={{ color: '#8B9BB4' }}>{label}</span>
              <span className="num text-sm font-semibold" style={{ color }}>{fmt.number(val)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Jauge par jour */}
      {cj.length > 0 && (
        <div className="p-4 rounded-2xl" style={{ background: '#0D1526', border: '1px solid #1A2840' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#8B9BB4' }}>
            Participants par jour
          </p>
          <div className="space-y-3">
            {cj.map(({ jour, label, vip, standard, total }) => (
              <div key={jour}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold capitalize" style={{ color: '#F0F4FF' }}>{label}</span>
                  <span className="num text-xs font-bold" style={{ color: '#F59E0B' }}>{fmt.number(total)}</span>
                </div>
                <div className="flex gap-3 text-xs">
                  <span style={{ color: '#8B9BB4' }}>VIP <span className="num font-semibold" style={{ color: '#F59E0B' }}>{fmt.number(vip)}</span></span>
                  <span style={{ color: '#8B9BB4' }}>Standard <span className="num font-semibold" style={{ color: '#068EEA' }}>{fmt.number(standard)}</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs comportementaux */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Commandes ≥ 2 billets', val: fmt.number(cm.multi ?? 0),                    sub: `${cm.pct_multi ?? 0}% des commandes`,  color: '#8B5CF6' },
          { label: 'Tickets / client',       val: mc.tickets_par_client != null ? String(mc.tickets_par_client.toFixed(1)) : '—', sub: 'moyenne',           color: '#06B6D4' },
          { label: 'CA / client',            val: mc.montant_par_client  != null ? fmt.currency(mc.montant_par_client)  : '—', sub: 'montant moyen',     color: '#F59E0B' },
          { label: 'Commandes simples',      val: fmt.number(cm.single ?? 0),                   sub: `${cm.total ? (100-(cm.pct_multi??0)).toFixed(1) : 0}% des commandes`, color: '#8B9BB4' },
        ].map(({ label, val, sub, color }) => (
          <div key={label} className="p-3 rounded-xl" style={{ background: '#0D1526', border: '1px solid #1A2840' }}>
            <p className="text-2xs uppercase tracking-wider mb-1" style={{ color: '#4A5568', fontSize: '0.625rem' }}>{label}</p>
            <p className="num text-xl font-bold" style={{ color }}>{val}</p>
            <p className="text-xs mt-0.5" style={{ color: '#4A5568' }}>{sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
