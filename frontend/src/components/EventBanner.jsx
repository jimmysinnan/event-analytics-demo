import { useEdition } from '../context/EditionContext'
import { getTheme } from '../store/eventStore'

export default function EventBanner() {
  const { activeEdition, activeEvent } = useEdition()
  const theme = getTheme(activeEdition?.id)

  if (!theme?.bannerOn || !activeEvent) return null

  const fontSizeMap = { sm: '1.125rem', md: '1.375rem', lg: '1.75rem' }
  const fontSize = fontSizeMap[theme.textSize ?? 'md']

  return (
    <div
      style={{
        height: `${theme.bannerHeight ?? 140}px`,
        position: 'relative',
        overflow: 'hidden',
        backgroundImage: theme.imageUrl
          ? `linear-gradient(to bottom, rgba(5,8,15,0.45), rgba(5,8,15,0.85)), url(${theme.imageUrl})`
          : `linear-gradient(135deg, ${theme.primary ?? '#6366F1'}, ${theme.secondary ?? '#F59E0B'})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        flexShrink: 0,
      }}>
      <div className="absolute inset-0 flex flex-col justify-end px-6 pb-4">
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-1"
          style={{ color: theme.primary ?? '#6366F1', fontFamily: theme.fontFamily }}>
          {activeEvent.name}
        </p>
        <h2
          className="font-bold leading-tight"
          style={{
            color:      theme.textColor ?? '#fff',
            fontFamily: theme.fontFamily,
            fontSize,
          }}>
          {activeEdition?.name}
        </h2>
      </div>
    </div>
  )
}
