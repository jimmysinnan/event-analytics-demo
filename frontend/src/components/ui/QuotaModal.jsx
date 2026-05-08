import { X, TrendingUp, Mail, Zap } from 'lucide-react'

const CONTACT_EMAIL = 'contact@orbyon.com'

const MESSAGES = {
  events: {
    title: 'Limite d\'événements atteinte',
    body:  'Votre pack ne permet pas d\'ajouter un événement supplémentaire. Vous pouvez demander une extension ou passer à une offre supérieure.',
    subject: 'Demande extension événements — Event Analytics',
  },
  editions: {
    title: 'Limite d\'éditions actives atteinte',
    body:  'Votre pack inclut déjà le nombre maximum d\'éditions activées. Pour analyser une nouvelle édition, contactez Event Analytics afin de l\'activer.',
    subject: 'Demande activation édition — Event Analytics',
  },
  ai_reports: {
    title: 'Quota de rapports IA atteint',
    body:  'Votre quota de rapports IA est atteint. Vous pouvez demander une extension de rapports ou passer à une offre supérieure.',
    subject: 'Demande extension rapports IA — Event Analytics',
  },
}

export default function QuotaModal({ type, used, max, onClose }) {
  const meta = MESSAGES[type] ?? MESSAGES.events

  function openMailto(subject) {
    const body = encodeURIComponent(
      `Bonjour,\n\nJe souhaite ${subject.toLowerCase()} pour mon instance Event Analytics.\n\nPack actuel : quota ${type} — ${used}/${max}\n\nMerci.`
    )
    window.open(`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${body}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-2xl p-6"
        style={{ background: '#0D1526', border: '1px solid #1A2840', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#4A5568] hover:text-[#8B9BB4] transition-colors"
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <Zap size={22} className="text-[#F59E0B]" strokeWidth={1.8} />
        </div>

        <h3 className="text-base font-bold text-white mb-2">{meta.title}</h3>
        <p className="text-sm text-[#8B9BB4] leading-relaxed mb-2">{meta.body}</p>

        {/* Quota bar */}
        {max > 0 && (
          <div className="mb-5">
            <div className="flex justify-between text-xs text-[#4A5568] mb-1.5">
              <span>Utilisé</span>
              <span className="font-semibold text-white">{used} / {max}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1A2840' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (used / max) * 100)}%`,
                  background: used >= max ? '#EF4444' : '#F59E0B',
                }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={() => openMailto('Demande d\'extension — ' + meta.subject)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition hover:opacity-90"
            style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.3)' }}
          >
            <Mail size={15} strokeWidth={2} />
            Demander une extension
          </button>
          <button
            onClick={() => openMailto('Demande d\'upgrade pack — ' + meta.subject)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #6366F1, #4338CA)', color: '#fff' }}
          >
            <TrendingUp size={15} strokeWidth={2} />
            Demander un upgrade
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl text-xs font-medium text-[#4A5568] hover:text-[#8B9BB4] transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
