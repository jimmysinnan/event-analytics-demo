import { useState, useEffect } from 'react'
import { Image, Palette, Type, Check } from 'lucide-react'
import { getTheme, saveTheme } from '../store/eventStore'
import { createEventTheme } from '../lib/models'

const GOOGLE_FONTS = [
  'Outfit', 'Fraunces', 'Playfair Display', 'Montserrat',
  'Raleway', 'Oswald', 'Bebas Neue', 'Dancing Script',
]

const TEXT_SIZES = [
  { id: 'sm', label: 'Petit' },
  { id: 'md', label: 'Moyen' },
  { id: 'lg', label: 'Grand' },
]

export default function EventThemeEditor({ editionId, onSave }) {
  const [theme, setTheme] = useState(createEventTheme({ editionId }))
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = getTheme(editionId)
    if (stored) setTheme(stored)
    else setTheme(createEventTheme({ editionId }))
  }, [editionId])

  const set = k => v => setTheme(t => ({ ...t, [k]: v }))

  function handleSave() {
    saveTheme(editionId, theme)
    onSave?.(theme)
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  return (
    <div className="space-y-5">

      {/* Image */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#8B9BB4' }}>
          <Image size={11} /> Image de fond (affiche, visuel officiel)
        </label>
        <input
          className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
          style={{ background: '#111D33', border: '1px solid #1A2840' }}
          placeholder="URL de l'image…"
          value={theme.imageUrl ?? ''}
          onChange={e => set('imageUrl')(e.target.value || null)}
        />
        {theme.imageUrl && (
          <div className="mt-2 h-20 rounded-xl overflow-hidden relative"
            style={{
              backgroundImage: `linear-gradient(rgba(5,8,15,0.5),rgba(5,8,15,0.7)),url(${theme.imageUrl})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
            }}>
            <p className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">Aperçu</p>
          </div>
        )}
      </div>

      {/* Colors */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#8B9BB4' }}>
          <Palette size={11} /> Couleurs
        </label>
        <div className="space-y-2">
          {[
            { key: 'primary',   label: 'Couleur principale' },
            { key: 'secondary', label: 'Couleur secondaire'  },
            { key: 'textColor', label: 'Couleur du texte'    },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <input type="color" value={theme[key] ?? '#6366F1'}
                onChange={e => set(key)(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
              />
              <div>
                <p className="text-xs font-medium" style={{ color: '#F0F4FF' }}>{label}</p>
                <p className="text-xs font-mono" style={{ color: '#4A5568' }}>{theme[key]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Font */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#8B9BB4' }}>
          <Type size={11} /> Typographie
        </label>
        <select
          className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none mb-2"
          style={{ background: '#111D33', border: '1px solid #1A2840', colorScheme: 'dark' }}
          value={theme.fontFamily ?? 'Outfit'}
          onChange={e => set('fontFamily')(e.target.value)}>
          {GOOGLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <div className="flex gap-2">
          {TEXT_SIZES.map(s => (
            <button key={s.id}
              onClick={() => set('textSize')(s.id)}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium transition"
              style={{
                background: theme.textSize === s.id ? 'rgba(99,102,241,0.2)' : '#111D33',
                border: `1px solid ${theme.textSize === s.id ? '#6366F1' : '#1A2840'}`,
                color:  theme.textSize === s.id ? '#A5B4FC' : '#8B9BB4',
                fontFamily: theme.fontFamily,
              }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Banner toggle */}
      <div className="flex items-center justify-between p-3 rounded-xl"
        style={{ background: '#111D33', border: '1px solid #1A2840' }}>
        <div>
          <p className="text-sm font-medium" style={{ color: '#F0F4FF' }}>Bannière événement</p>
          <p className="text-xs mt-0.5" style={{ color: '#4A5568' }}>Afficher une bannière en haut des pages</p>
        </div>
        <button
          onClick={() => set('bannerOn')(!theme.bannerOn)}
          className="w-12 h-6 rounded-full transition-colors relative"
          style={{ background: theme.bannerOn ? '#6366F1' : '#1A2840' }}>
          <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
            style={{ transform: theme.bannerOn ? 'translateX(26px)' : 'translateX(2px)' }} />
        </button>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition hover:opacity-90"
        style={{ background: '#6366F1' }}>
        {saved ? <><Check size={14} strokeWidth={2.5} /> Thème enregistré</> : 'Enregistrer le thème'}
      </button>
    </div>
  )
}
