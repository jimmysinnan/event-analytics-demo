import { NavLink, useLocation } from 'react-router-dom'
import { useEdition } from '../../context/EditionContext'
import {
  LayoutDashboard, Ticket, ShoppingCart, Users,
  Gift, Package, BarChart3, Settings, ChevronRight,
  BarChart2, FileText, Upload, CalendarDays
} from 'lucide-react'

const NAV = [
  { label: 'Événements',       icon: CalendarDays,    to: '/evenements',    section: 'main'  },
  { label: 'Vue Globale',      icon: LayoutDashboard, to: '/',              section: 'main'  },
  { label: 'Billetterie',      icon: Ticket,          to: '/billetterie',   section: 'main'  },
  { label: 'Consommation',     icon: ShoppingCart,    to: '/consommation',  section: 'main'  },
  { label: 'Profil Client',    icon: Users,           to: '/profil-client', section: 'main'  },
  { label: 'Invitations',      icon: Gift,            to: '/invitations',   section: 'main'  },
  { label: 'Stocks Édition+1', icon: Package,         to: '/stocks',        section: 'main'  },
  { label: 'Restitution PDF',  icon: FileText,        to: '/restitution',   section: 'tools' },
  { label: 'Importer données', icon: Upload,          to: '/import',        section: 'tools' },
  { label: 'Paramètres',       icon: Settings,        to: '/parametres',    section: 'tools' },
]

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation()
  const { activeEvent, activeEdition } = useEdition()
  const mainNav  = NAV.filter(n => n.section === 'main')
  const toolsNav = NAV.filter(n => n.section === 'tools')

  return (
    <aside
      className="fixed top-0 left-0 h-screen z-40 flex flex-col transition-all duration-300 ease-spring"
      style={{
        width: collapsed ? '64px' : '240px',
        background: 'linear-gradient(180deg, #080E1E 0%, #05080F 100%)',
        borderRight: '1px solid #1A2840',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[#1A2840]">
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4338CA 100%)' }}
        >
          <BarChart2 size={16} className="text-white" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div className="animate-fade-in overflow-hidden">
            <p className="text-sm font-bold text-white tracking-tight leading-none">EVENT</p>
            <p className="text-2xs text-[#8B9BB4] mt-0.5 tracking-widest uppercase">Analytics</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {!collapsed && (
          <p className="px-3 mb-2 text-2xs font-semibold text-[#4A5568] uppercase tracking-widest">
            Pilotage
          </p>
        )}
        {mainNav.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'nav-item-active' : ''} ${collapsed ? 'justify-center px-0' : ''}`
            }
          >
            <Icon size={17} strokeWidth={1.8} className="flex-shrink-0" />
            {!collapsed && <span className="animate-fade-in truncate">{label}</span>}
            {!collapsed && location.pathname === to && (
              <ChevronRight size={14} className="ml-auto text-[#21AAFA] opacity-60" />
            )}
          </NavLink>
        ))}

        {!collapsed && (
          <p className="px-3 mt-5 mb-2 text-2xs font-semibold text-[#4A5568] uppercase tracking-widest">
            Outils
          </p>
        )}
        {collapsed && <div className="my-3 divider mx-2" />}
        {toolsNav.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'nav-item-active' : ''} ${collapsed ? 'justify-center px-0' : ''}`
            }
          >
            <Icon size={17} strokeWidth={1.8} className="flex-shrink-0" />
            {!collapsed && <span className="animate-fade-in truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Edition badge */}
      {!collapsed && (
        <div className="px-3 pb-4 animate-fade-in">
          <div
            className="rounded-xl p-3"
            style={{
              background: 'color-mix(in srgb, var(--event-primary, #6366F1) 10%, transparent)',
              border:     '1px solid color-mix(in srgb, var(--event-primary, #6366F1) 25%, transparent)',
            }}
          >
            <p className="text-2xs font-semibold uppercase tracking-widest mb-1"
              style={{ color: 'var(--event-primary, #818CF8)' }}>
              Édition active
            </p>
            <p className="text-sm font-bold text-white">{activeEdition?.name ?? activeEvent?.name ?? 'EVENT Analytics'}</p>
            <p className="text-2xs text-[#8B9BB4] mt-0.5">{activeEvent?.name ?? ''}{activeEdition?.year ? ` · ${activeEdition.year}` : ''}</p>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center h-10 border-t border-[#1A2840] text-[#4A5568] hover:text-[#8B9BB4] transition-colors"
      >
        <ChevronRight
          size={16}
          className="transition-transform duration-300"
          style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}
        />
      </button>
    </aside>
  )
}
