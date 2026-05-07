import { useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * MultiSelect — liste déroulante à sélection multiple
 *
 * Props :
 *   options     — [string] ou [{value, label}]
 *   selected    — [string] — valeurs sélectionnées
 *   onChange    — (newSelected: string[]) => void
 *   label       — string — libellé au-dessus
 *   placeholder — string — texte quand rien n'est sélectionné
 */
export default function MultiSelect({ options = [], selected = [], onChange, label, placeholder = 'Sélectionner…' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const display = selected.length === 0
    ? placeholder
    : selected.length <= 2
      ? selected.join(', ')
      : `${selected.slice(0, 2).join(', ')} +${selected.length - 2}`

  return (
    <div className="relative" ref={ref}>
      {label && (
        <p className="mb-1.5 font-semibold uppercase tracking-wider"
          style={{ color: '#4A5568', fontSize: '0.6rem' }}>{label}</p>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between gap-2 w-full px-2.5 py-2 rounded-lg text-xs transition"
        style={{
          background: '#080E1E',
          border: `1px solid ${open ? '#2A3850' : '#1A2840'}`,
          color: selected.length ? '#F0F4FF' : '#8B9BB4',
        }}
      >
        <span className="truncate">{display}</span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {selected.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: 'rgba(6,142,234,0.15)', color: '#21AAFA', fontSize: '0.6rem' }}>
              {selected.length}
            </span>
          )}
          <ChevronDown size={11} className="text-[#4A5568]" />
        </div>
      </button>

      {open && options.length > 0 && (
        <div className="absolute z-50 w-full mt-1 rounded-xl shadow-xl overflow-hidden"
          style={{ background: '#111D33', border: '1px solid #1A2840', maxHeight: '220px', overflowY: 'auto' }}>
          <div className="flex items-center gap-3 px-3 py-2 sticky top-0"
            style={{ background: '#111D33', borderBottom: '1px solid #1A2840' }}>
            <button className="text-xs font-semibold text-[#068EEA] hover:text-[#21AAFA]"
              onClick={() => onChange(options.map(o => typeof o === 'string' ? o : o.value))}>
              Tous
            </button>
            <span style={{ color: '#1A2840' }}>·</span>
            <button className="text-xs font-semibold text-[#4A5568] hover:text-[#8B9BB4]"
              onClick={() => onChange([])}>
              Aucun
            </button>
          </div>
          {options.map(opt => {
            const val     = typeof opt === 'string' ? opt : opt.value
            const lbl     = typeof opt === 'string' ? opt : opt.label
            const checked = selected.includes(val)
            return (
              <label key={val}
                className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-[#1A2840] transition-colors"
                style={{ borderBottom: '1px solid rgba(26,40,64,0.3)' }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => checked
                    ? onChange(selected.filter(s => s !== val))
                    : onChange([...selected, val])
                  }
                  className="accent-[#068EEA] w-3.5 h-3.5 flex-shrink-0"
                />
                <span className="text-xs truncate" style={{ color: checked ? '#F0F4FF' : '#8B9BB4' }}>{lbl}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
