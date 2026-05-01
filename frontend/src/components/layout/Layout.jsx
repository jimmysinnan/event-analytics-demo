import { useState, useMemo, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import EventBanner from '../EventBanner'
import { useEdition } from '../../context/EditionContext'

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const { theme } = useEdition()

  // Injecter les variables CSS sur :root — tous les composants en héritent
  const themeVars = useMemo(() => {
    if (!theme) return {}
    return {
      '--event-primary':   theme.primary   ?? '#6366F1',
      '--event-secondary': theme.secondary ?? '#F59E0B',
      '--event-text':      theme.textColor ?? '#FFFFFF',
      '--event-font':      theme.fontFamily ? `"${theme.fontFamily}", system-ui, sans-serif` : 'inherit',
    }
  }, [theme])

  // Injection d'un <style> global qui redéfinit les accents visuels avec les variables thème
  // → sans modifier chaque composant individuellement
  useEffect(() => {
    const styleId = 'ea-theme-overrides'
    let el = document.getElementById(styleId)
    if (!el) {
      el = document.createElement('style')
      el.id = styleId
      document.head.appendChild(el)
    }
    const p  = theme?.primary   ?? '#6366F1'
    const s  = theme?.secondary ?? '#F59E0B'
    const fn = theme?.fontFamily ? `"${theme.fontFamily}", system-ui, sans-serif` : 'inherit'

    el.textContent = `
      /* ── Navigation active ───────────────────────────── */
      .nav-item-active {
        background: color-mix(in srgb, ${p} 14%, transparent) !important;
        color: ${p} !important;
        border-color: color-mix(in srgb, ${p} 30%, transparent) !important;
      }
      .nav-item-active svg { color: ${p} !important; }

      /* ── Boutons primaires ───────────────────────────── */
      .btn-primary-theme {
        background: ${p} !important;
      }

      /* ── Barres de progression ───────────────────────── */
      .progress-theme { background: ${p} !important; }

      /* ── Lignes de graphique Recharts ────────────────── */
      .recharts-line-curve { stroke: ${p} !important; }
      .recharts-area-area  { fill: color-mix(in srgb, ${p} 20%, transparent) !important; }
      .recharts-area-curve { stroke: ${p} !important; }

      /* ── Titres de sections (eyebrow) ────────────────── */
      .eyebrow-theme { color: ${p} !important; }

      /* ── Typographie des titres d'événement ──────────── */
      .event-title { font-family: ${fn} !important; }

      /* ── Top bar accent des cartes ───────────────────── */
      .card-accent-event {
        background: linear-gradient(90deg, ${p}, ${s}) !important;
      }

      /* ── Focus ring global ───────────────────────────── */
      :focus-visible { outline-color: ${p} !important; }

      /* ── Scrollbar ───────────────────────────────────── */
      ::-webkit-scrollbar-thumb { background: color-mix(in srgb, ${p} 40%, #1A2840) !important; }
    `
    return () => el.textContent = ''
  }, [theme])

  // Fond avec image si bannière active (transparence légère pour garder la lisibilité)
  const bgStyle = theme?.bannerOn && theme?.imageUrl
    ? {
        backgroundImage: `url(${theme.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }
    : {}

  return (
    <div className="flex min-h-screen bg-[#05080F]" style={{ ...themeVars, ...bgStyle }}>
      {/* Overlay sombre pour maintenir la lisibilité si image de fond */}
      {theme?.bannerOn && theme?.imageUrl && (
        <div className="fixed inset-0 pointer-events-none" style={{ background: 'rgba(5,8,15,0.88)', zIndex: 0 }} />
      )}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div
        className="flex-1 flex flex-col min-h-screen transition-all duration-300 ease-spring"
        style={{ marginLeft: collapsed ? '64px' : '240px', position: 'relative', zIndex: 1 }}
      >
        <Header loading={false} />
        <main className="flex-1 p-6 animate-fade-in">
          <EventBanner />
          <Outlet />
        </main>
      </div>
    </div>
  )
}
