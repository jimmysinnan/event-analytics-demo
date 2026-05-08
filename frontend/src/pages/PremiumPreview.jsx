import { Lock, TrendingUp, Users, Gift, Package, FileText, Sparkles } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const MODULE_META = {
  '/profil-client': {
    icon: Users,
    label: 'Profil Client',
    description: 'Analysez le profil socio-démographique de vos acheteurs, les habitudes de consommation par segment et l\'évolution de la fidélité entre éditions.',
    preview: [
      { label: 'Acheteurs récurrents', value: '38%', delta: '+6 pts' },
      { label: 'Panier moyen', value: '87 €',  delta: '+12 €' },
      { label: 'Âge médian', value: '29 ans',  delta: '' },
    ],
  },
  '/invitations': {
    icon: Gift,
    label: 'Invitations',
    description: 'Suivez en temps réel l\'activation des invitations, le taux de présence et l\'impact sur la billetterie payante.',
    preview: [
      { label: 'Invitations envoyées', value: '1 240', delta: '' },
      { label: 'Taux activation', value: '64%',   delta: '+8 pts' },
      { label: 'CA indirect estimé', value: '9 300 €', delta: '' },
    ],
  },
  '/stocks': {
    icon: Package,
    label: 'Stocks Édition+1',
    description: 'Anticipez vos besoins pour la prochaine édition : stocks boissons, articles, jauge billetterie — calculés automatiquement depuis vos données historiques.',
    preview: [
      { label: 'Bières recommandées', value: '4 200 L', delta: 'vs 3 800 L' },
      { label: 'Vins recommandés', value: '1 100 L',   delta: 'vs 980 L' },
      { label: 'Confiance modèle', value: '91%',        delta: '' },
    ],
  },
  '/restitution': {
    icon: FileText,
    label: 'Restitution PDF',
    description: 'Générez des rapports PDF complets avec IA : bilan exécutif, analyse des pertes invisibles, persona acheteur, prévisions édition+1.',
    preview: [
      { label: 'Types de rapport', value: '9',       delta: '' },
      { label: 'Rapports générés', value: '—',       delta: '' },
      { label: 'Délai génération', value: '~45 s',   delta: '' },
    ],
  },
}

const DEFAULT_META = {
  icon: Lock,
  label: 'Module Premium',
  description: 'Ce module est disponible à partir du Pack Saison.',
  preview: [],
}

export default function PremiumPreview() {
  const { pathname } = useLocation()
  const meta = MODULE_META[pathname] ?? DEFAULT_META
  const Icon = meta.icon

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-8 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #080E1E 0%, #0D1526 100%)' }}>

      {/* Blurred fake content in background */}
      <div className="absolute inset-0 pointer-events-none select-none" style={{ filter: 'blur(6px)', opacity: 0.18 }}>
        <div className="p-8 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl p-6" style={{ background: '#131F35', height: 80 + i * 20 }} />
          ))}
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-xl p-4" style={{ background: '#131F35', height: 100 }} />
            ))}
          </div>
        </div>
      </div>

      {/* Overlay card */}
      <div className="relative z-10 max-w-lg w-full text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4338CA 100%)', boxShadow: '0 0 40px rgba(99,102,241,0.4)' }}>
            <Icon size={36} className="text-white" strokeWidth={1.5} />
          </div>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-4 text-xs font-semibold"
          style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)', color: '#818CF8' }}>
          <Sparkles size={11} />
          Pack Saison & Premium
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">{meta.label}</h1>
        <p className="text-[#8B9BB4] text-sm leading-relaxed mb-8">{meta.description}</p>

        {/* Blurred KPIs preview */}
        {meta.preview.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {meta.preview.map(kpi => (
              <div key={kpi.label} className="rounded-xl p-4 text-left" style={{ background: '#131F35', border: '1px solid #1A2840' }}>
                <div className="text-lg font-bold text-white blur-sm select-none">{kpi.value}</div>
                {kpi.delta && <div className="text-xs text-[#21AAFA] blur-sm select-none">{kpi.delta}</div>}
                <div className="text-2xs text-[#4A5568] mt-1">{kpi.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="rounded-2xl p-6 text-left" style={{ background: '#131F35', border: '1px solid #1A2840' }}>
          <div className="flex items-start gap-3 mb-4">
            <TrendingUp size={18} className="text-[#6366F1] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">Passez au Pack Saison</p>
              <p className="text-xs text-[#8B9BB4] mt-0.5">
                Débloquez tous les modules : Profil Client, Invitations, Stocks Édition+1 et les 9 types de rapports IA.
              </p>
            </div>
          </div>
          <p className="text-xs text-[#4A5568]">
            Contactez votre interlocuteur Orbyon pour une mise à niveau de votre pack.
          </p>
        </div>
      </div>
    </div>
  )
}
