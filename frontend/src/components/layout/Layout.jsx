import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import EventBanner from '../EventBanner'

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen bg-[#05080F]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div
        className="flex-1 flex flex-col min-h-screen transition-all duration-300 ease-spring"
        style={{ marginLeft: collapsed ? '64px' : '240px' }}
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
