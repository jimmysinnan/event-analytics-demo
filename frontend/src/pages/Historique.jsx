import { useMemo } from 'react'
import { useEventContext } from '../context/EventContext'
import ComparaisonHistorique from '../components/ComparaisonHistorique'

export default function Historique() {
  const { eventEditions, activeEvent } = useEventContext()

  // Reconstituer dataByYear depuis les données statiques de chaque édition
  // Les vraies données viendraient de la DB — ici on utilise ce qui est disponible
  const dataByYear = useMemo(() => {
    const result = {}
    eventEditions.forEach(ed => {
      // Les données d'évolution sont stockées dans le raw_json des imports
      // Pour l'instant on affiche un placeholder si pas de données importées
      if (ed.year) {
        result[String(ed.year)] = []
      }
    })
    return result
  }, [eventEditions])

  const hasData = Object.values(dataByYear).some(arr => arr.length > 0)

  return (
    <div className="space-y-6 animate-slide-up">

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#068EEA' }}>
          Comparatif inter-éditions
        </p>
        <h2 className="text-lg font-bold text-white">
          {activeEvent?.name ?? 'Historique'} — Évolution par édition
        </h2>
        <p className="text-sm mt-1" style={{ color: '#8B9BB4' }}>
          Les données apparaissent automatiquement après import des fichiers billetterie de chaque édition.
        </p>
      </div>

      {hasData ? (
        <ComparaisonHistorique dataByYear={dataByYear} />
      ) : (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-2xl"
          style={{ border: '1px dashed #1A2840' }}>
          <p className="text-4xl mb-4 opacity-40">📊</p>
          <p className="text-sm font-semibold" style={{ color: '#8B9BB4' }}>
            Aucune donnée historique disponible
          </p>
          <p className="text-xs mt-2 text-center max-w-xs" style={{ color: '#4A5568' }}>
            Importez les fichiers billetterie de vos éditions passées depuis le module Billetterie.
            Les données apparaîtront automatiquement ici.
          </p>
        </div>
      )}
    </div>
  )
}
