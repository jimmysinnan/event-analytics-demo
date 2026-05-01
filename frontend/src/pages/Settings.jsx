import { useState, useEffect } from 'react'
import { Settings2, Sparkles, Key, Monitor, Info, CheckCircle, AlertCircle, Save } from 'lucide-react'
import SectionCard from '../components/ui/SectionCard'
import { useEdition } from '../context/EditionContext'
import { API } from '../lib/api'

const LS_SETTINGS = 'ea_app_settings'

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(LS_SETTINGS) ?? '{}') } catch { return {} }
}
function saveSettings(data) {
  localStorage.setItem(LS_SETTINGS, JSON.stringify(data))
}

export default function Settings() {
  const { activeEdition, activeEvent } = useEdition()
  const [settings, setSettings] = useState(loadSettings)
  const [saved,    setSaved]    = useState(false)
  const [apiStatus, setApiStatus] = useState(null) // null | 'ok' | 'error'

  const set = k => v => setSettings(s => ({ ...s, [k]: v }))

  function handleSave() {
    saveSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function testApiConnection() {
    try {
      const res = await fetch(`${API}/health`)
      setApiStatus(res.ok ? 'ok' : 'error')
    } catch {
      setApiStatus('error')
    }
    setTimeout(() => setApiStatus(null), 4000)
  }

  return (
    <div className="space-y-6 animate-slide-up max-w-2xl">

      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#6366F1' }}>
          Configuration
        </p>
        <h2 className="text-lg font-bold text-white">Paramètres</h2>
        <p className="text-sm mt-1" style={{ color: '#8B9BB4' }}>
          Configuration de l'instance — clé IA, connexion backend, informations.
        </p>
      </div>

      {/* Édition active — info */}
      <div className="p-4 rounded-2xl flex items-start gap-3"
        style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)' }}>
        <Monitor size={16} style={{ color: '#A5B4FC' }} strokeWidth={1.8} className="mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-white">
            {activeEvent?.name ?? 'Aucun événement'} — {activeEdition?.name ?? 'Aucune édition active'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#8B9BB4' }}>
            ID édition : <code className="text-[#06B6D4]">{activeEdition?.id ?? '—'}</code>
          </p>
        </div>
      </div>

      {/* Connexion backend */}
      <SectionCard
        title="Connexion backend"
        subtitle={`API : ${API}`}
        action={
          <button
            onClick={testApiConnection}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition hover:opacity-80"
            style={{ background: 'rgba(6,142,234,0.12)', color: '#21AAFA', border: '1px solid rgba(6,142,234,0.2)' }}>
            Tester la connexion
          </button>
        }
      >
        {apiStatus && (
          <div className="flex items-center gap-2 p-3 rounded-xl text-xs"
            style={{
              background: apiStatus === 'ok' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${apiStatus === 'ok' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
              color: apiStatus === 'ok' ? '#10B981' : '#FCA5A5',
            }}>
            {apiStatus === 'ok'
              ? <><CheckCircle size={13} strokeWidth={2} /> Backend accessible</>
              : <><AlertCircle size={13} strokeWidth={2} /> Backend non accessible — vérifiez que le serveur est démarré</>
            }
          </div>
        )}
        <div className="mt-3 space-y-1">
          <p className="text-xs text-[#8B9BB4]">
            URL configurée via <code className="text-[#06B6D4]">VITE_API_URL</code> dans <code className="text-[#06B6D4]">.env.local</code>
          </p>
          <p className="text-xs text-[#4A5568]">
            Valeur actuelle : <span className="text-[#8B9BB4]">{API}</span>
          </p>
        </div>
      </SectionCard>

      {/* Clé IA Anthropic */}
      <SectionCard
        title="Intelligence artificielle"
        subtitle="Clé API Anthropic — requise pour la génération de rapports IA"
        action={
          <span className="flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(99,102,241,0.12)', color: '#A5B4FC', border: '1px solid rgba(99,102,241,0.2)' }}>
            <Sparkles size={10} strokeWidth={2} />
            Claude Sonnet 4.6
          </span>
        }
      >
        <div className="space-y-3">
          <div className="flex items-start gap-2 p-3 rounded-xl"
            style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}>
            <Info size={13} className="mt-0.5 flex-shrink-0" style={{ color: '#06B6D4' }} strokeWidth={2} />
            <p className="text-xs" style={{ color: '#8B9BB4' }}>
              La clé API Anthropic est configurée dans <code className="text-[#06B6D4]">backend/.env</code> via <code className="text-[#06B6D4]">ANTHROPIC_API_KEY</code>.
              Elle n'est pas exposée ici pour des raisons de sécurité.
            </p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1A2840' }}>
            <div className="flex items-center gap-2 mb-1">
              <Key size={13} style={{ color: '#8B9BB4' }} strokeWidth={1.8} />
              <p className="text-xs font-semibold text-white">ANTHROPIC_API_KEY</p>
            </div>
            <p className="text-xs font-mono" style={{ color: '#4A5568' }}>
              sk-ant-••••••••••••••••••••••
            </p>
            <p className="text-2xs mt-2" style={{ color: '#4A5568', fontSize: '0.6rem' }}>
              Modifier dans <code>backend/.env</code> puis redémarrer le serveur
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Préférences démo */}
      <SectionCard
        title="Mode démo"
        subtitle="Configuration de la session de démonstration"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#8B9BB4' }}>
              Nom affiché dans les rapports PDF
            </label>
            <input
              className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none transition"
              style={{ background: '#080E1E', border: '1px solid #1A2840' }}
              placeholder="Ex: Festival Client, Baccha Festival…"
              value={settings.appName ?? ''}
              onChange={e => set('appName')(e.target.value)}
              onFocus={e => e.target.style.borderColor = '#6366F1'}
              onBlur={e  => e.target.style.borderColor = '#1A2840'}
            />
            <p className="text-2xs mt-1" style={{ color: '#4A5568', fontSize: '0.6rem' }}>
              Remplace "Event Analytics" dans les en-têtes PDF si renseigné
            </p>
          </div>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: saved ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)', color: saved ? '#10B981' : '#A5B4FC', border: `1px solid ${saved ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'}` }}>
            {saved ? <><CheckCircle size={14} strokeWidth={2} /> Enregistré</> : <><Save size={14} strokeWidth={1.8} /> Enregistrer</>}
          </button>
        </div>
      </SectionCard>

      {/* Infos version */}
      <SectionCard title="Version" subtitle="Informations système">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Application',   value: 'Event Analytics' },
            { label: 'Version',       value: 'v1.0 — Démo' },
            { label: 'Frontend',      value: 'React 18 + Vite + Tailwind' },
            { label: 'Backend',       value: 'FastAPI + Python + SQLite' },
            { label: 'IA',            value: 'Claude Sonnet 4.6' },
            { label: 'Mode',          value: 'Démonstration' },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1A2840' }}>
              <p className="text-2xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#4A5568', fontSize: '0.6rem' }}>{label}</p>
              <p className="text-xs font-medium text-white">{value}</p>
            </div>
          ))}
        </div>
      </SectionCard>

    </div>
  )
}
