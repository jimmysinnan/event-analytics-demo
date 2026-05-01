export default function SectionCard({ title, subtitle, action, children, className = '', accent = false }) {
  return (
    <div className={`card flex flex-col gap-4 ${className}`} style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Ligne d'accent thème en haut si accent=true */}
      {accent && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'var(--event-primary, #6366F1)',
          opacity: 0.7,
        }} />
      )}
      <div className="p-5 flex flex-col gap-4 flex-1">
        {(title || action) && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white leading-tight">{title}</p>
              {subtitle && <p className="text-xs text-[#8B9BB4] mt-0.5">{subtitle}</p>}
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
