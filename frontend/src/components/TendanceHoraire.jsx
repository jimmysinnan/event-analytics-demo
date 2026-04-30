import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { fmt } from '../lib/format'

function TooltipHoraire({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 rounded-xl text-xs" style={{ background: '#111D33', border: '1px solid #1A2840' }}>
      <p className="mb-0.5" style={{ color: '#8B9BB4' }}>{label}h</p>
      <p className="num font-bold" style={{ color: '#F0F4FF' }}>{fmt.number(payload[0].value)} commandes</p>
    </div>
  )
}

export default function TendanceHoraire({ data }) {
  if (!data?.length) return null

  const maxNb   = Math.max(...data.map(d => d.nb))
  const peakHour = data.find(d => d.nb === maxNb)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#8B9BB4' }}>
          Tendance horaire de finalisation des commandes
        </p>
        {peakHour && (
          <span className="text-xs num font-semibold" style={{ color: '#F59E0B' }}>
            Pic : {peakHour.heure}h — {fmt.number(maxNb)} cmd
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke="#1A2840" strokeDasharray="3 3" />
          <XAxis
            dataKey="heure"
            tick={{ fill: '#8B9BB4', fontSize: 9 }}
            axisLine={false} tickLine={false}
            tickFormatter={h => `${h}h`}
            interval={2}
          />
          <YAxis tick={{ fill: '#8B9BB4', fontSize: 9 }} axisLine={false} tickLine={false} width={28} />
          <Tooltip content={<TooltipHoraire />} cursor={{ stroke: '#1A2840', strokeWidth: 1 }} />
          <Line
            type="monotone" dataKey="nb" stroke="#068EEA" strokeWidth={2}
            dot={({ cx, cy, payload }) =>
              payload.nb === maxNb
                ? <circle key={payload.heure} cx={cx} cy={cy} r={4} fill="#F59E0B" stroke="none" />
                : null
            }
            activeDot={{ r: 4, fill: '#21AAFA', stroke: 'none' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
