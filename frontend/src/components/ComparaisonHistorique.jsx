import { fmt } from '../lib/format'

const MONTH_LABELS = {
  '01':'Janvier','02':'Février','03':'Mars','04':'Avril','05':'Mai','06':'Juin',
  '07':'Juillet','08':'Août','09':'Septembre','10':'Octobre','11':'Novembre','12':'Décembre',
}

function MonthlyTable({ title, years, allMonths, getValue, formatVal, accentColor }) {
  const totaux  = years.map(yr => allMonths.reduce((s, m) => s + (getValue(yr, m) ?? 0), 0))
  const nonZero = yr => allMonths.filter(m => (getValue(yr, m) ?? 0) > 0).length || 1
  const moyennes = years.map((yr, i) => totaux[i] / nonZero(yr))

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#8B9BB4' }}>{title}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th className="text-left py-1.5 px-2 font-semibold" style={{ color: '#4A5568', width: '28%' }}>Mois</th>
              {years.map(yr => (
                <th key={yr} className="text-right py-1.5 px-2 font-semibold num" style={{ color: accentColor }}>{yr}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allMonths.map(m => (
              <tr key={m} style={{ borderBottom: '1px solid #1A2840' }}>
                <td className="py-1.5 px-2" style={{ color: '#8B9BB4' }}>{MONTH_LABELS[m] ?? m}</td>
                {years.map(yr => {
                  const val = getValue(yr, m)
                  return (
                    <td key={yr} className="text-right py-1.5 px-2 num font-medium"
                      style={{ color: val ? '#F0F4FF' : '#4A5568' }}>
                      {val ? formatVal(val) : '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #1A2840' }}>
              <td className="py-1.5 px-2 font-bold" style={{ color: '#F0F4FF' }}>Total</td>
              {totaux.map((t, i) => (
                <td key={i} className="text-right py-1.5 px-2 num font-bold" style={{ color: accentColor }}>
                  {formatVal(t)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-1 px-2" style={{ color: '#8B9BB4' }}>Moy. mensuelle</td>
              {moyennes.map((m, i) => (
                <td key={i} className="text-right py-1 px-2 num" style={{ color: '#8B9BB4' }}>
                  {formatVal(m)}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export default function ComparaisonHistorique({ dataByYear }) {
  // dataByYear: { '2023': [{periode:'2023-01', ca:x, quantite:y},...], '2024': [...] }
  if (!dataByYear || Object.keys(dataByYear).length === 0) return null

  const years = Object.keys(dataByYear).sort()

  // Collect all unique month numbers (MM) across all years
  const allMonths = [...new Set(
    Object.values(dataByYear).flat().map(d => d.periode?.slice(5, 7)).filter(Boolean)
  )].sort()

  const getCA  = (yr, m) => (dataByYear[yr] || []).find(d => d.periode?.endsWith(`-${m}`))?.ca       ?? null
  const getQty = (yr, m) => (dataByYear[yr] || []).find(d => d.periode?.endsWith(`-${m}`))?.quantite  ?? null

  return (
    <div className="space-y-6">
      <MonthlyTable
        title="Chiffre d'affaires billetterie — mensuel réel"
        years={years} allMonths={allMonths}
        getValue={getCA} formatVal={v => fmt.currency(v)}
        accentColor="#F59E0B"
      />
      <MonthlyTable
        title="Nombre de tickets vendus — mensuel réel"
        years={years} allMonths={allMonths}
        getValue={getQty} formatVal={v => fmt.number(Math.round(v))}
        accentColor="#068EEA"
      />
    </div>
  )
}
