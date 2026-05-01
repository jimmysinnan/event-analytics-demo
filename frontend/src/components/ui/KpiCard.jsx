import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const ACCENT_STYLES = {
  blue:   { bar: '#068EEA', glow: 'rgba(6,142,234,0.2)',   text: '#21AAFA', bg: 'rgba(6,142,234,0.08)'   },
  gold:   { bar: '#F59E0B', glow: 'rgba(245,158,11,0.2)',  text: '#F59E0B', bg: 'rgba(245,158,11,0.08)'  },
  teal:   { bar: '#06B6D4', glow: 'rgba(6,182,212,0.2)',   text: '#06B6D4', bg: 'rgba(6,182,212,0.08)'   },
  violet: { bar: '#8B5CF6', glow: 'rgba(139,92,246,0.2)',  text: '#8B5CF6', bg: 'rgba(139,92,246,0.08)'  },
  green:  { bar: '#10B981', glow: 'rgba(16,185,129,0.2)',  text: '#10B981', bg: 'rgba(16,185,129,0.08)'  },
  coral:  { bar: '#F97316', glow: 'rgba(249,115,22,0.2)',  text: '#F97316', bg: 'rgba(249,115,22,0.08)'  },
  // Accent dynamique — utilise les couleurs du thème événement
  event:  { bar: 'var(--event-primary, #6366F1)', glow: 'color-mix(in srgb, var(--event-primary, #6366F1) 20%, transparent)', text: 'var(--event-primary, #6366F1)', bg: 'color-mix(in srgb, var(--event-primary, #6366F1) 8%, transparent)' },
}

function Delta({ value }) {
  if (value === null || value === undefined) return null
  const positive = value > 0
  const neutral  = value === 0
  const abs = Math.abs(value)
  const Icon = neutral ? Minus : positive ? TrendingUp : TrendingDown
  const color = neutral ? '#8B9BB4' : positive ? '#10B981' : '#EF4444'

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold"
      style={{ background: `${color}20`, color }}
    >
      <Icon size={10} strokeWidth={2.5} />
      {neutral ? '—' : `${positive ? '+' : ''}${abs.toFixed(1)}%`}
    </span>
  )
}

export default function KpiCard({ label, value, sub, delta, accent = 'blue', icon: Icon, suffix = '', prefix = '' }) {
  const style = ACCENT_STYLES[accent] ?? ACCENT_STYLES.blue

  return (
    <div className="card card-hover relative overflow-hidden p-5 flex flex-col gap-3">
      {/* Top accent bar — s'adapte au thème si accent='event' */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: `linear-gradient(90deg, ${style.bar}, transparent)` }}
      />

      {/* Header row */}
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-[#8B9BB4] uppercase tracking-wider leading-none">
          {label}
        </p>
        {Icon && (
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: style.bg }}
          >
            <Icon size={14} style={{ color: style.text }} strokeWidth={1.8} />
          </div>
        )}
      </div>

      {/* Value */}
      <div>
        <p className="num font-bold text-white leading-none" style={{ fontSize: '1.875rem' }}>
          {prefix}{value}{suffix}
        </p>
        {sub && (
          <p className="text-xs text-[#8B9BB4] mt-1.5 leading-snug">{sub}</p>
        )}
      </div>

      {/* Delta */}
      {delta !== undefined && (
        <div className="flex items-center gap-2 mt-auto pt-1 border-t border-[#1A2840]">
          <Delta value={delta} />
          <span className="text-2xs text-[#4A5568]">vs édition précédente</span>
        </div>
      )}
    </div>
  )
}
