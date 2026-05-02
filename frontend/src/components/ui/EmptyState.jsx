import { useNavigate } from 'react-router-dom'
import { Upload, Database } from 'lucide-react'

/**
 * EmptyState — affiché quand un module n'a pas de données pour l'année/édition active.
 *
 * Props :
 *   year       — année active (ex: 2023)
 *   module     — nom du module (ex: "Profil Client")
 *   message    — message principal (optionnel)
 *   hint       — indication secondaire (optionnel)
 *   showImport — affiche le bouton "Importer données" (défaut: true)
 */
export default function EmptyState({
  year,
  module,
  message,
  hint,
  showImport = true,
}) {
  const navigate = useNavigate()

  const defaultMessage = `Aucune donnée ${module ? `${module} ` : ''}disponible pour ${year ? `l'édition ${year}` : 'cette édition'}.`
  const defaultHint    = 'Les données apparaîtront ici après import du fichier correspondant.'

  return (
    <div
      className="flex flex-col items-center justify-center py-16 rounded-2xl text-center"
      style={{ border: '1px dashed #1A2840', background: 'rgba(255,255,255,0.01)' }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(74,85,104,0.15)' }}
      >
        <Database size={22} style={{ color: '#4A5568' }} strokeWidth={1.5} />
      </div>

      <p className="text-sm font-semibold text-white mb-1">
        {message ?? defaultMessage}
      </p>
      <p className="text-xs text-[#4A5568] max-w-sm leading-relaxed mb-5">
        {hint ?? defaultHint}
      </p>

      {showImport && (
        <button
          onClick={() => navigate('/importer-donnees')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition hover:opacity-80"
          style={{ background: 'rgba(99,102,241,0.15)', color: '#A5B4FC', border: '1px solid rgba(99,102,241,0.25)' }}
        >
          <Upload size={13} strokeWidth={2} />
          Importer des données
        </button>
      )}
    </div>
  )
}
