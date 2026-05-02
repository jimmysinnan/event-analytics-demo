import { useState } from 'react'
import {
  FileText, Download, Eye, Loader2, CheckCircle,
  AlertCircle, BarChart3, Users, Globe, Zap
} from 'lucide-react'
import SectionCard from '../components/ui/SectionCard'
import AiReport from '../components/AiReport'
import { useEdition } from '../context/EditionContext'
import { API } from '../lib/api'

const PRESENTATIONS = [
  {
    key: 'global',
    title: 'Chiffres globaux du festival',
    description: 'Vue synthétique de l\'édition — CA consommation, festivaliers, billetterie, invitations et tendance horaire.',
    pages: 3,
    icon: Globe,
    color: '#068EEA',
    sections: ['KPI globaux (CA, festivaliers, billetterie)', 'Tendance horaire bars + recommandations', 'Analyse invitations par PDV'],
  },
  {
    key: 'pdv',
    title: 'Performance des points de vente',
    description: 'Analyse détaillée par bar et zone — top produits, CA, segmentation clients par budget.',
    pages: 7,
    icon: BarChart3,
    color: '#F59E0B',
    sections: ['Vue globale CA par PDV', 'Zone Nord · Zone VIP · Zone Sud', 'Zone VIP Int. · Zone Centrale · Partenaire', 'Segmentation clients par tranche dépense'],
  },
  {
    key: 'profil',
    title: 'Profil client de l\'édition',
    description: 'Démographie, comportement d\'achat, préférences de consommation et recommandations stratégiques.',
    pages: 3,
    icon: Users,
    color: '#8B5CF6',
    sections: ['Persona + répartition âge et genre', 'Poids CA par tranche + heures chaudes', 'Recommandations stratégiques par profil'],
  },
]

function PdfCard({ pres, year }) {
  const [viewStatus, setViewStatus]     = useState('idle')
  const [genStatus, setGenStatus]       = useState('idle')
  const { icon: Icon, color } = pres

  async function viewExisting() {
    setViewStatus('loading')
    try {
      const res = await fetch(`${API}/api/pdf/existing/${pres.key}`)
      if (!res.ok) throw new Error(res.status)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setViewStatus('success')
      setTimeout(() => setViewStatus('idle'), 3000)
    } catch {
      setViewStatus('error')
      setTimeout(() => setViewStatus('idle'), 4000)
    }
  }

  async function generateNew() {
    setGenStatus('loading')
    try {
      const res = await fetch(`${API}/api/pdf/generate/${pres.key}?edition=${year}`)
      if (!res.ok) throw new Error(res.status)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `Festival_${year}_${pres.key}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      setGenStatus('success')
      setTimeout(() => setGenStatus('idle'), 3000)
    } catch {
      setGenStatus('error')
      setTimeout(() => setGenStatus('idle'), 4000)
    }
  }

  const ViewIcon   = viewStatus === 'loading' ? Loader2 : viewStatus === 'success' ? CheckCircle : viewStatus === 'error' ? AlertCircle : Eye
  const DlIcon     = genStatus === 'loading'  ? Loader2 : genStatus === 'success'  ? CheckCircle : genStatus === 'error'  ? AlertCircle : Download

  return (
    <div className="card card-hover flex flex-col gap-4 p-5 relative overflow-hidden">
      {/* Accent bar top */}
      <div className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18` }}>
          <Icon size={20} style={{ color }} strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">{pres.title}</p>
          <p className="text-xs text-[#8B9BB4] mt-1 leading-snug">{pres.description}</p>
        </div>
        <span className="text-2xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
          style={{ background: `${color}15`, color }}>
          {pres.pages} pages
        </span>
      </div>

      {/* Sections */}
      <div className="space-y-1.5">
        {pres.sections.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: color }} />
            <p className="text-xs text-[#8B9BB4]">{s}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-[#1A2840]">
        {/* Consulter l'existant — disponible uniquement si PDF_SOURCE_DIR configuré */}
        <button
          onClick={viewExisting}
          disabled={viewStatus === 'loading'}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold
                     border transition-all duration-150 hover:bg-[#111D33]"
          style={{
            borderColor: viewStatus === 'success' ? '#10B981' : viewStatus === 'error' ? '#EF4444' : '#1A2840',
            color: viewStatus === 'success' ? '#10B981' : viewStatus === 'error' ? '#EF4444' : '#8B9BB4',
          }}
        >
          <ViewIcon size={13} strokeWidth={2}
            className={viewStatus === 'loading' ? 'animate-spin' : ''} />
          {viewStatus === 'loading' ? 'Ouverture…'
           : viewStatus === 'success' ? 'Ouvert !'
           : viewStatus === 'error'   ? 'Non configuré'
           : 'Consulter PDF'}
        </button>

        {/* Générer — données de démonstration intégrées */}
        <button
          onClick={generateNew}
          disabled={genStatus === 'loading'}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold
                     transition-all duration-150 hover:opacity-90 active:scale-95"
          style={{
            background: genStatus === 'success' ? 'rgba(16,185,129,0.15)'
                      : genStatus === 'error'   ? 'rgba(239,68,68,0.15)'
                      : `${color}18`,
            color:      genStatus === 'success' ? '#10B981'
                      : genStatus === 'error'   ? '#EF4444'
                      : color,
            border: `1px solid ${genStatus === 'success' ? '#10B981' : genStatus === 'error' ? '#EF4444' : `${color}30`}`,
          }}
        >
          <DlIcon size={13} strokeWidth={2}
            className={genStatus === 'loading' ? 'animate-spin' : ''} />
          {genStatus === 'loading' ? 'Génération…'
           : genStatus === 'success' ? 'Téléchargé !'
           : genStatus === 'error'   ? 'Erreur'
           : <span className="flex items-center gap-1">
               Générer
               <span className="opacity-60 text-2xs px-1 py-0.5 rounded" style={{ fontSize: '0.55rem', background: 'rgba(255,255,255,0.08)' }}>DÉMO</span>
             </span>
          }
        </button>
      </div>

      {/* Note démo sous les boutons */}
      <p className="text-2xs text-center leading-snug" style={{ color: '#4A5568', fontSize: '0.575rem' }}>
        Générer produit un PDF avec les données de démonstration intégrées.
      </p>
    </div>
  )
}

export default function Restitution() {
  const { year, activeEdition } = useEdition()
  const editionId   = activeEdition?.id
  const editionName = activeEdition?.name

  async function handleDownloadReport() {
    if (!editionId) return
    const url = `${API}/api/report/${editionId}?edition_name=${encodeURIComponent(editionName ?? 'Edition')}`
    const res = await fetch(url)
    if (!res.ok) return
    const blob = await res.blob()
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `rapport_${editionName ?? 'edition'}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 animate-slide-up max-w-5xl">

      {/* Intro */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Eye,      label: 'Consulter',  sub: `Ouvre le PDF de référence de l'édition ${year}`,  color: '#068EEA' },
          { icon: Zap,      label: 'Générer',    sub: 'Crée un nouveau PDF avec les données actuelles', color: '#F59E0B' },
          { icon: Download, label: 'Télécharger',sub: 'Sauvegarde le PDF directement sur votre poste', color: '#8B5CF6' },
        ].map(({ icon: Icon, label, sub, color }) => (
          <div key={label} className="card p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}18` }}>
              <Icon size={15} style={{ color }} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">{label}</p>
              <p className="text-2xs text-[#8B9BB4] mt-0.5 leading-snug">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Note */}
      <div className="p-3 rounded-xl flex items-start gap-3"
        style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)' }}>
        <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#F59E0B' }} />
        <p className="text-xs text-[#8B9BB4]">
          <span className="text-white font-semibold">Consulter</span> ouvre le PDF de référence si disponible pour l'édition sélectionnée.
          <span className="text-white font-semibold"> Générer</span> recrée un PDF complet avec les données de l'édition sélectionnée
          (<span className="text-[#F59E0B] font-semibold">{year}</span>) dans le même format de restitution.
          Le backend doit être démarré pour la génération.
        </p>
      </div>

      {/* ── Analyse IA — Claude Sonnet 4.6 ── */}
      <AiReport />

      {/* Rapport billetterie texte */}
      <div className="flex justify-end">
        <button
          onClick={handleDownloadReport}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition hover:opacity-80"
          style={{ background: '#111D33', border: '1px solid #1A2840', color: '#8B9BB4' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Exporter données brutes (.txt)
        </button>
      </div>

      {/* 3 PDF cards */}
      <div className="grid xl:grid-cols-3 gap-5">
        {PRESENTATIONS.map(pres => (
          <PdfCard key={pres.key} pres={pres} year={year} />
        ))}
      </div>

      {/* Infos format */}
      <SectionCard title="Format des présentations" subtitle="Structure reproduite à l'identique">
        <div className="grid xl:grid-cols-3 gap-4">
          {PRESENTATIONS.map(pres => {
            const Icon = pres.icon
            return (
              <div key={pres.key} className="rounded-xl p-3"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1A2840' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={13} style={{ color: pres.color }} strokeWidth={2} />
                  <p className="text-xs font-semibold text-white">{pres.title}</p>
                </div>
                <div className="space-y-1">
                  {pres.sections.map((s, i) => (
                    <p key={i} className="text-2xs text-[#8B9BB4]">
                      <span className="text-[#4A5568] mr-1">P{i + 1}.</span>{s}
                    </p>
                  ))}
                </div>
                <p className="num text-2xs text-[#4A5568] mt-2">{pres.pages} pages · Format A4 · Fond sombre</p>
              </div>
            )
          })}
        </div>
      </SectionCard>

    </div>
  )
}
