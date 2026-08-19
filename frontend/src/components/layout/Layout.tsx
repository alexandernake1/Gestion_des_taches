import React, { useState } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { SystemAnnouncementsBanner } from './SystemAnnouncementsBanner'
import { useWebSocket } from '@/hooks/useWebSocket'
import { ProductTourModal } from '@/components/tutorial/ProductTourModal'
import { HelpCenterDrawer } from '@/components/tutorial/HelpCenterDrawer'
import { SharePlatformModal } from '@/components/common/SharePlatformModal'

interface LayoutProps {
  children: React.ReactNode
  title: string
}

export function Layout({ children, title }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  useWebSocket()

  return (
    <div className="app-surface flex min-h-screen">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col lg:pl-72">
        <Header title={title} onMenuClick={() => setIsSidebarOpen(true)} />
        <SystemAnnouncementsBanner />
        <main className="flex-1 overflow-x-hidden animate-fade-in">
          {children}
        </main>
      </div>
      <ProductTourModal />
      <HelpCenterDrawer />
      <SharePlatformModal />
    </div>
  )
}
