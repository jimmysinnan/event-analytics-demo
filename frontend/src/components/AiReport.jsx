import { useState, useRef } from 'react'
import { Sparkles, Copy, Check, RefreshCw, Image, X } from 'lucide-react'
import { useEdition } from '../context/EditionContext'
import { API } from '../lib/api'

const REPORT_TYPES = [
  {
    id:    'executive',
    label: 'Résumé exécutif',
    desc:  'Synthèse décisionnelle — performance, points forts, alertes',
    icon:  '📊',
    group: 'analyse',
  },
  {
    id:    'post_event',
    label: 'Rapport post-événement',
    desc:  'CA, fréquentation, billetterie, conso, panier, produits forts/faibles',
    icon:  '📋',
    group: 'analyse',
  },
  {
    id:    'recommandations',
    label: 'Recommandations',
    desc:  '3 priorités actionnables pour la prochaine édition',
    icon:  '🎯',
    group: 'analyse',
  },
  {
    id:    'prevision',
    label: 'Prévision prochaine édition',
    desc:  'Ventes attendues, stocks, fréquentation, tensions, scénarios',
    icon:  '🔮',
    group: 'analyse',
  },
  {
    id:    'pertes_invisibles',
    label: 'Pertes invisibles',
    desc:  'Revenus manqués et opportunités non exploitées',
    icon:  '🔍',
    group: 'analyse',
  },
  {
    id:    'partenaires',
    label: 'Rapport partenaires / sponsors',
    desc:  'Fréquentation, profil, exposition, retombées, indicateurs clés',
    icon:  '🤝',
    group: 'externe',
  },
  {
    id:    'persona',
    label: 'Persona client',
    desc:  'Profil type, segments, comportement d\'achat, recommandations marketing',
    icon:  '👤',
    group: 'analyse',
  },
]

// Markdown → HTML
function renderMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h4 style="color:#F0F4FF;font-weight:700;margin:.875rem 0 .2rem">$1</h4>')
    .replace(/^## (.+)$/gm,  '<h3 style="color:#F0F4FF;font-weight:700;font-size:1rem;margin:1.125rem 0 .3rem">$1</h3>')
    .replace(/^# (.+)$/gm,   '<h2 style="color:#F0F4FF;font-weight:800;font-size:1.125rem;margin:1.25rem 0 .375rem">$1</h2>')
    .replace(/^- (.+)$/gm,   '<li style="margin:.25rem 0;padding-left:.5rem">$1</li>')
    .replace(/\n/g, '<br>')
}

// Convertit un File en base64 data-URL
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload  = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

export default function AiReport({ apiKey }) {
  const { activeEdition } = useEdition()
  const editionId   = activeEdition?.id   ?? null
  const editionName = activeEdition?.name ?? 'Édition'
  const editionYear = activeEdition?.year ?? null

  const [selectedType, setSelectedType] = useState('executive')
  const [open,    setOpen]    = useState(false)
  const [text,    setText]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [copied,  setCopied]  = useState(false)

  // Image d'inspiration
  const [imageFile,    setImageFile]    = useState(null)  // File object
  const [imagePreview, setImagePreview] = useState(null)  // data URL preview
  const [imageB64,     setImageB64]     = useState(null)  // base64 sans prefix
  const [imageMime,    setImageMime]    = useState(null)  // image/jpeg etc.
  const fileRef  = useRef(null)
  const abortRef = useRef(null)

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await fileToBase64(file)
    // Extraire mime type et base64 pur
    const [header, b64] = dataUrl.split(',')
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
    setImageFile(file)
    setImagePreview(dataUrl)
    setImageB64(b64)
    setImageMime(mime)
  }

  function removeImage() {
    setImageFile(null)
    setImagePreview(null)
    setImageB64(null)
    setImageMime(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function generate() {
    if (!editionId) return
    setLoading(true)
    setError(null)
    setText('')
    setOpen(true)

    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const body = {
        api_key:      apiKey ?? '',
        image_b64:    imageB64    ?? null,
        image_mime:   imageMime   ?? null,
        edition_year: editionYear ?? null,   // permet le fallback edition_analytics
      }

      const res = await fetch(
        `${API}/api/ai/report/${editionId}/stream?report_type=${selectedType}&edition_name=${encodeURIComponent(editionName)}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
          signal:  controller.signal,
        }
      )

      if (!res.ok) throw new Error(`Erreur ${res.status}`)

      const reader = res.body.getReader()
      const dec    = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = dec.decode(value).split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const d = JSON.parse(line.slice(6))
            if (d.error) { setError(d.error); break }
            if (d.chunk) setText(t => t + d.chunk)
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function copyText() {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const currentType = REPORT_TYPES.find(r => r.id === selectedType)

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#0D1526', border: '1px solid #1A2840' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5"
        style={{ borderBottom: '1px solid #1A2840', background: 'rgba(99,102,241,0.05)' }}>
        <div className="flex items-center gap-2">
          <Sparkles size={15} style={{ color: '#A5B4FC' }} strokeWidth={1.8} />
          <span className="text-sm font-semibold text-white">Analyse IA</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(99,102,241,0.15)', color: '#A5B4FC', border: '1px solid rgba(99,102,241,0.25)' }}>
            Claude Sonnet 4.6
          </span>
        </div>
        {text && (
          <button onClick={copyText}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition hover:bg-[#111D33]"
            style={{ color: copied ? '#10B981' : '#8B9BB4', border: '1px solid #1A2840' }}>
            {copied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} strokeWidth={1.8} />}
            {copied ? 'Copié' : 'Copier'}
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">

        {/* Types de rapport */}
        <div>
          <p className="text-2xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: '#4A5568', fontSize: '0.575rem' }}>Type de rapport</p>
          <div className="grid grid-cols-2 gap-2">
            {REPORT_TYPES.map(r => (
              <button
                key={r.id}
                onClick={() => { setSelectedType(r.id); setText(''); setError(null) }}
                className="flex items-start gap-2 p-3 rounded-xl text-left transition"
                style={{
                  background: selectedType === r.id ? 'rgba(99,102,241,0.12)' : '#111D33',
                  border:     `1px solid ${selectedType === r.id ? '#6366F1' : '#1A2840'}`,
                }}>
                <span className="text-base leading-none flex-shrink-0 mt-0.5">{r.icon}</span>
                <div>
                  <p className="text-xs font-semibold leading-tight"
                    style={{ color: selectedType === r.id ? '#A5B4FC' : '#F0F4FF' }}>
                    {r.label}
                  </p>
                  <p className="mt-0.5 leading-snug" style={{ color: '#4A5568', fontSize: '0.55rem' }}>
                    {r.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Image d'inspiration */}
        <div>
          <p className="text-2xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: '#4A5568', fontSize: '0.575rem' }}>
            Image d'inspiration — optionnel
          </p>
          <p className="text-xs mb-2" style={{ color: '#4A5568' }}>
            Affiche, visuel événement, charte graphique… Claude adapte le ton et la mise en forme du rapport.
          </p>

          {!imagePreview ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition hover:opacity-80"
                style={{ background: '#111D33', border: '1px dashed #1A2840', color: '#8B9BB4' }}>
                <Image size={14} strokeWidth={1.8} />
                Importer une image d'inspiration…
              </button>
            </>
          ) : (
            <div className="relative rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(99,102,241,0.3)' }}>
              <img
                src={imagePreview}
                alt="Inspiration"
                className="w-full object-cover"
                style={{ maxHeight: 120, objectPosition: 'center top' }}
              />
              <div className="absolute inset-0 flex flex-col justify-end p-2"
                style={{ background: 'linear-gradient(transparent, rgba(5,8,15,0.8))' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white truncate pr-2">
                    {imageFile?.name}
                  </span>
                  <button
                    onClick={removeImage}
                    className="flex-shrink-0 p-1 rounded-lg transition hover:bg-[#1A2840]"
                    style={{ color: '#8B9BB4' }}>
                    <X size={13} strokeWidth={2} />
                  </button>
                </div>
              </div>
              {/* Badge "Vision IA activée" */}
              <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(99,102,241,0.85)', fontSize: '0.55rem' }}>
                <Sparkles size={9} strokeWidth={2} color="white" />
                <span className="text-white font-semibold">Vision IA activée</span>
              </div>
            </div>
          )}
        </div>

        {/* Bouton générer */}
        <button
          onClick={generate}
          disabled={loading || !editionId}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition"
          style={{
            background: loading ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #6366F1, #4338CA)',
            opacity: !editionId ? 0.5 : 1,
          }}>
          {loading
            ? <><RefreshCw size={15} className="animate-spin" /> Génération en cours…</>
            : <><Sparkles size={15} strokeWidth={2} />
                Générer — {currentType?.label}
                {imageB64 && <span className="ml-1 opacity-70 text-xs">· avec image</span>}
              </>
          }
        </button>

        {/* Erreur */}
        {error && (
          <div className="p-3 rounded-xl text-xs"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}>
            <strong>Erreur :</strong> {error}
            {error.includes('API_KEY') && (
              <p className="mt-1" style={{ color: '#8B9BB4' }}>
                Ajoutez <code style={{ color: '#06B6D4' }}>ANTHROPIC_API_KEY=sk-ant-...</code> dans{' '}
                <code style={{ color: '#06B6D4' }}>backend/.env</code>
              </p>
            )}
          </div>
        )}

        {/* Résultat streaming */}
        {(text || loading) && open && (
          <div className="rounded-xl p-4 text-sm leading-relaxed"
            style={{ background: '#080E1E', border: '1px solid #1A2840', color: '#CBD5E1', minHeight: 80 }}>
            {text ? (
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />
            ) : (
              <div className="flex items-center gap-2" style={{ color: '#4A5568' }}>
                <RefreshCw size={12} className="animate-spin" />
                <span className="text-xs">Claude analyse vos données{imageB64 ? ' et votre image' : ''}…</span>
              </div>
            )}
            {loading && (
              <span className="inline-block w-0.5 h-4 ml-0.5 animate-pulse"
                style={{ background: '#6366F1', verticalAlign: 'middle' }} />
            )}
          </div>
        )}

      </div>
    </div>
  )
}
