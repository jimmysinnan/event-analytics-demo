import { useState, useEffect, useRef } from 'react'
import { Image, Palette, Type, Check, Upload, Wand2 } from 'lucide-react'
import { useEdition } from '../context/EditionContext'
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

// ── Extraction des couleurs dominantes via Canvas API ─────────────────────────
function extractDominantColors(imageUrl) {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const SIZE = 60
      const canvas = document.createElement('canvas')
      canvas.width = SIZE
      canvas.height = SIZE
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, SIZE, SIZE)

      const data = ctx.getImageData(0, 0, SIZE, SIZE).data
      const buckets = {}

      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3]
        if (a < 128) continue // transparent
        // Quantiser en intervalles de 32 pour réduire le bruit
        const r = Math.round(data[i]   / 32) * 32
        const g = Math.round(data[i+1] / 32) * 32
        const b = Math.round(data[i+2] / 32) * 32
        // Exclure les noirs/blancs trop proches
        const lum = 0.299*r + 0.587*g + 0.114*b
        if (lum < 25 || lum > 230) continue
        const key = `${r},${g},${b}`
        buckets[key] = (buckets[key] ?? 0) + 1
      }

      const sorted = Object.entries(buckets)
        .sort(([, a], [, b]) => b - a)

      const toHex = key => {
        const [r, g, b] = key.split(',').map(Number)
        return '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('')
      }

      // Chercher une couleur secondaire suffisamment différente de la primaire
      const primary = sorted[0] ? toHex(sorted[0][0]) : '#6366F1'
      let secondary = '#F59E0B'
      for (const [key] of sorted.slice(1)) {
        const [r2,g2,b2] = key.split(',').map(Number)
        const [r1,g1,b1] = primary.slice(1).match(/../g).map(h => parseInt(h,16))
        const diff = Math.abs(r2-r1) + Math.abs(g2-g1) + Math.abs(b2-b1)
        if (diff > 80) { secondary = toHex(key); break }
      }

      resolve({ primary, secondary })
    }
    img.onerror = () => resolve({ primary: '#6366F1', secondary: '#F59E0B' })
    img.src = imageUrl
  })
}

// ── Composant ─────────────────────────────────────────────────────────────────
export default function EventThemeEditor({ editionId }) {
  // Lire et écrire le thème via le contexte (réactif)
  const { theme: ctxTheme, updateTheme } = useEdition()

  const [local, setLocal]         = useState(null)
  const [saved, setSaved]         = useState(false)
  const [extracting, setExtracting] = useState(false)
  const fileRef = useRef(null)

  // Synchroniser le state local avec le thème du contexte
  useEffect(() => {
    setLocal(ctxTheme ?? createEventTheme({ editionId }))
  }, [ctxTheme, editionId])

  if (!local) return null

  const set = k => v => setLocal(t => ({ ...t, [k]: v }))

  // ── Upload fichier depuis le PC ────────────────────────────────────────────
  function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const dataUrl = ev.target.result
      set('imageUrl')(dataUrl)
      // Lancer l'extraction automatique après lecture
      handleExtractColors(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  // ── Extraction des couleurs depuis l'image ─────────────────────────────────
  async function handleExtractColors(url) {
    const src = url ?? local.imageUrl
    if (!src) return
    setExtracting(true)
    try {
      const { primary, secondary } = await extractDominantColors(src)
      setLocal(t => ({ ...t, primary, secondary }))
    } finally {
      setExtracting(false)
    }
  }

  // ── Sauvegarde — met à jour le contexte React (déclenche les re-renders) ──
  function handleSave() {
    updateTheme(local)
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  return (
    <div className="space-y-5">

      {/* Image de fond */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-1.5"
          style={{ color: '#8B9BB4' }}>
          <Image size={11} /> Image de fond (affiche, visuel officiel)
        </label>

        {/* URL manuelle */}
        <input
          className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none mb-2"
          style={{ background: '#111D33', border: '1px solid #1A2840' }}
          placeholder="URL de l'image…"
          value={typeof local.imageUrl === 'string' && !local.imageUrl.startsWith('data:')
            ? local.imageUrl : ''}
          onChange={e => set('imageUrl')(e.target.value || null)}
        />

        {/* Upload depuis PC */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm font-medium transition hover:opacity-80"
          style={{ background: '#111D33', border: '1px dashed #1A2840', color: '#8B9BB4' }}>
          <Upload size={14} strokeWidth={1.8} />
          Importer une image depuis le bureau…
        </button>

        {/* Aperçu + extraction couleurs */}
        {local.imageUrl && (
          <div className="mt-2 rounded-xl overflow-hidden relative" style={{ height: '80px' }}>
            <div style={{
              height: '100%',
              backgroundImage: `linear-gradient(rgba(5,8,15,0.45),rgba(5,8,15,0.75)),url(${local.imageUrl})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
            }} />
            <button
              onClick={() => handleExtractColors()}
              disabled={extracting}
              className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition hover:opacity-90"
              style={{ background: 'rgba(99,102,241,0.85)', color: '#fff' }}
              title="Détecter les couleurs dominantes de l'image">
              <Wand2 size={12} strokeWidth={2} />
              {extracting ? 'Analyse…' : 'Détecter les couleurs'}
            </button>
          </div>
        )}
      </div>

      {/* Couleurs */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: '#8B9BB4' }}>
          <Palette size={11} /> Couleurs
        </label>
        <div className="space-y-2">
          {[
            { key: 'primary',   label: 'Couleur principale' },
            { key: 'secondary', label: 'Couleur secondaire'  },
            { key: 'textColor', label: 'Couleur du texte'    },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <input
                type="color"
                value={local[key] ?? '#6366F1'}
                onChange={e => set(key)(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
              />
              <div>
                <p className="text-xs font-medium" style={{ color: '#F0F4FF' }}>{label}</p>
                <p className="text-xs font-mono" style={{ color: '#4A5568' }}>{local[key]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Typographie */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: '#8B9BB4' }}>
          <Type size={11} /> Typographie
        </label>
        <select
          className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none mb-2"
          style={{ background: '#111D33', border: '1px solid #1A2840', colorScheme: 'dark' }}
          value={local.fontFamily ?? 'Outfit'}
          onChange={e => set('fontFamily')(e.target.value)}>
          {GOOGLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <div className="flex gap-2">
          {TEXT_SIZES.map(s => (
            <button key={s.id}
              onClick={() => set('textSize')(s.id)}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium transition"
              style={{
                background: local.textSize === s.id ? 'rgba(99,102,241,0.2)' : '#111D33',
                border: `1px solid ${local.textSize === s.id ? '#6366F1' : '#1A2840'}`,
                color:  local.textSize === s.id ? '#A5B4FC' : '#8B9BB4',
                fontFamily: local.fontFamily,
              }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toggle bannière */}
      <div className="flex items-center justify-between p-3 rounded-xl"
        style={{ background: '#111D33', border: '1px solid #1A2840' }}>
        <div>
          <p className="text-sm font-medium" style={{ color: '#F0F4FF' }}>Bannière événement</p>
          <p className="text-xs mt-0.5" style={{ color: '#4A5568' }}>Afficher une bannière en haut des pages</p>
        </div>
        <button
          onClick={() => set('bannerOn')(!local.bannerOn)}
          className="w-12 h-6 rounded-full transition-colors relative"
          style={{ background: local.bannerOn ? '#6366F1' : '#1A2840' }}>
          <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
            style={{ transform: local.bannerOn ? 'translateX(26px)' : 'translateX(2px)' }} />
        </button>
      </div>

      {/* Enregistrer */}
      <button
        onClick={handleSave}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition hover:opacity-90"
        style={{ background: '#6366F1' }}>
        {saved
          ? <><Check size={14} strokeWidth={2.5} /> Thème appliqué en direct</>
          : 'Enregistrer et appliquer'}
      </button>
    </div>
  )
}
