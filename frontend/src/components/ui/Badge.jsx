const VARIANTS = {
  up:      'badge-up',
  down:    'badge-down',
  neutral: 'badge-neutral',
  gold:    'badge-gold',
  blue:    'badge-blue',
}

export default function Badge({ children, variant = 'neutral' }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold uppercase tracking-wide ${VARIANTS[variant] ?? VARIANTS.neutral}`}
    >
      {children}
    </span>
  )
}
