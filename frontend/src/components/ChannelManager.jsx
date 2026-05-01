import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useEventContext } from '../context/EventContext'
import { CHANNEL_TYPES } from '../lib/models'

export default function ChannelManager() {
  const { channels, addChannel, removeChannel, activeEdition } = useEventContext()
  const [adding, setAdding]   = useState(false)
  const [form, setForm]       = useState({ name: '', type: 'weezevent' })

  function handleAdd() {
    if (!form.name.trim()) return
    addChannel({ ...form })
    setForm({ name: '', type: 'weezevent' })
    setAdding(false)
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#8B9BB4' }}>
          Canaux de distribution
        </p>
        <button
          onClick={() => setAdding(a => !a)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition hover:opacity-80"
          style={{ background: '#6366F1' }}>
          <Plus size={12} strokeWidth={2.5} />
          Ajouter
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="p-3 rounded-xl space-y-3" style={{ background: '#111D33', border: '1px solid #1A2840' }}>
          <input
            autoFocus
            className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none transition"
            style={{ background: '#0D1526', border: '1px solid #1A2840' }}
            placeholder="Nom du canal (ex: Weezevent web, CSE Renault…)"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            onFocus={e => e.target.style.borderColor = '#6366F1'}
            onBlur={e  => e.target.style.borderColor = '#1A2840'}
          />
          {/* Groupes de sources */}
          {[
            { key: 'billetterie', label: 'Billetterie événementielle' },
            { key: 'paiement',    label: 'Paiement en ligne' },
            { key: 'sursite',     label: 'Sur site / Réseau' },
            { key: 'autre',       label: 'Autre' },
          ].map(group => {
            const types = CHANNEL_TYPES.filter(t => t.group === group.key)
            if (!types.length) return null
            return (
              <div key={group.key}>
                <p className="text-2xs font-semibold uppercase tracking-widest mb-1.5"
                  style={{ color: '#4A5568', fontSize: '0.55rem' }}>
                  {group.label}
                </p>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {types.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setForm(f => ({ ...f, type: t.id }))}
                      className="flex flex-col items-center gap-0.5 p-2 rounded-lg text-xs font-medium transition"
                      style={{
                        background: form.type === t.id ? 'rgba(99,102,241,0.2)' : '#0D1526',
                        border:     `1px solid ${form.type === t.id ? '#6366F1' : '#1A2840'}`,
                        color:      form.type === t.id ? '#A5B4FC' : '#8B9BB4',
                      }}>
                      <span className="text-sm leading-none">{t.icon}</span>
                      <span className="leading-tight text-center" style={{ fontSize: '0.55rem' }}>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
          <div className="flex gap-2">
            <button
              onClick={() => { setAdding(false); setForm({ name: '', type: 'weezevent' }) }}
              className="flex-1 py-1.5 rounded-lg text-xs transition"
              style={{ border: '1px solid #1A2840', color: '#8B9BB4' }}>
              Annuler
            </button>
            <button
              onClick={handleAdd}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white transition hover:opacity-80"
              style={{ background: '#6366F1' }}>
              Créer
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {channels.length === 0 && !adding && (
        <div className="py-6 text-center rounded-xl" style={{ border: '1px dashed #1A2840' }}>
          <p className="text-xs" style={{ color: '#4A5568' }}>
            Aucun canal. Ajoutez Weezevent, Bizouk, CSE…
          </p>
        </div>
      )}

      {/* Channel list */}
      {channels.map(ch => {
        const type = CHANNEL_TYPES.find(t => t.id === ch.type)
        return (
          <div
            key={ch.id}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl"
            style={{ background: '#0D1526', border: '1px solid #1A2840' }}>
            <div className="flex items-center gap-2.5">
              <span className="text-base leading-none">{type?.icon ?? '📋'}</span>
              <div>
                <p className="text-sm font-medium" style={{ color: '#F0F4FF' }}>{ch.name}</p>
                <p className="text-xs" style={{ color: '#4A5568' }}>{type?.label ?? ch.type}</p>
              </div>
            </div>
            <button
              onClick={() => removeChannel(ch.id)}
              className="p-1.5 rounded-lg transition hover:bg-[#1A2840]"
              style={{ color: '#4A5568' }}
              title="Supprimer ce canal">
              <Trash2 size={13} strokeWidth={1.8} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
