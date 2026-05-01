import { useState, useRef, useEffect } from 'react'
import { Upload, Calendar, ChevronDown, Check } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useEdition } from '../../context/EditionContext'

const PAGE_TITLES = {
  '/':              { title: 'Vue Globale',       sub: 'Performance consolidée toutes éditions' },
  '/billetterie':   { title: 'Billetterie',       sub: 'Ventes, canaux, Pass Culture, CSE' },
  '/consommation':  { title: 'Consommation',      sub: 'CA, points de vente, top produits' },
  '/profil-client': { title: 'Profil Client',     sub: 'Démographie, comportement, tranches d\'âge' },
  '/invitations':   { title: 'Invitations',       sub: 'Volume, valeur, rentabilité' },
  '/stocks':        { title: 'Stocks Édition+1',  sub: 'Prévisions par bar et produit' },
  '/restitution':   { title: 'Restitution PDF',   sub: 'Rapports IA et présentations' },
  '/import':        { title: 'Importer données',  sub: 'Upload des fichiers de consommation et billetterie' },
  '/parametres':    { title: 'Paramètres',        sub: 'Configuration de l\'instance' },
}

export default function Header({ loading }) {
  const { pathname } = useLocation()
  const navigate     = useNavigate()
  const page         = PAGE_TITLES[pathname] ?? PAGE_TITLES['/']
  const { year, setYear, eventEditions = [] } = useEdition()
  const [open, setOpen] = useState(false)
  const dropRef = useRef(null)

  useEffect(() => {
    function handler(e) { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-6 h-16"
      style={{ background: 'rgba(5,8,15,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1A2840' }}
    >
      {/* Left — title */}
      <div>
        <h1 className="text-base font-semibold text-white leading-tight tracking-tight">{page.title}</h1>
        <p className="text-xs text-[#8B9BB4] mt-0.5 leading-none">{page.sub}</p>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-2">

        {/* Edition selector */}
        <div className="relative" ref={dropRef}>
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
                       border transition-all duration-150 select-none"
            style={{
              background: open ? '#111D33' : 'transparent',
              borderColor: open ? 'rgba(6,142,234,0.4)' : '#1A2840',
              color: open ? '#21AAFA' : '#8B9BB4',
            }}
          >
            <Calendar size={14} strokeWidth={1.8} />
            <span className="num font-semibold">{year}</span>
            <ChevronDown size={13} strokeWidth={2} className={`opacity-60 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div
              className="absolute right-0 top-full mt-1.5 w-48 rounded-xl py-1 z-50 animate-slide-up"
              style={{ background: '#0D1526', border: '1px solid #1A2840', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
            >
              <p className="px-3 pt-2 pb-1 text-2xs font-semibold text-[#4A5568] uppercase tracking-widest">Édition</p>
              {eventEditions.map(e => (
                <button
                  key={e.year}
                  onClick={() => { setYear(e.year); setOpen(false) }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-[#111D33]"
                  style={{ color: e.year === year ? '#21AAFA' : '#8B9BB4' }}
                >
                  <span className="num font-semibold">{e.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xs text-[#4A5568]">{(e.modules ?? e.available ?? []).length} modules</span>
                    {e.year === year && <Check size={12} className="text-[#21AAFA]" strokeWidth={2.5} />}
                  </div>
                </button>
              ))}
              <div className="mx-3 my-1 border-t border-[#1A2840]" />
              <p className="px-3 py-1.5 text-2xs text-[#4A5568] leading-snug">
                Les modules sans données pour l'édition sélectionnée affichent un indicateur de disponibilité.
              </p>
            </div>
          )}
        </div>

        {/* Upload */}
        <button
          onClick={() => navigate('/parametres')}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold text-white
                     transition-all duration-200 hover:opacity-90 active:scale-95 select-none"
          style={{ background: 'linear-gradient(135deg, #068EEA 0%, #0059A2 100%)' }}
        >
          <Upload size={14} strokeWidth={2} />
          Importer
        </button>
      </div>
    </header>
  )
}
