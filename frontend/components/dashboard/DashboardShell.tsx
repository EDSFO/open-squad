'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2, Menu, X } from 'lucide-react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const locale = pathname.startsWith('/pt-BR') ? 'pt-BR' : 'en-US'

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push(`/${locale}/auth/login`)
      return
    }

    setIsLoading(false)
  }, [router, locale])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#09090b]">
        <Loader2 className="h-8 w-8 animate-spin text-[#ef233c]" />
      </div>
    )
  }

  return (
    <div className="app-shell min-h-screen bg-transparent">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div
        className={`
          fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar />
      </div>

      <div className="flex flex-1 flex-col lg:pl-64">
        <div className="sticky top-0 z-30 flex h-16 items-center border-b border-white/10 bg-black/50 px-6 backdrop-blur-xl lg:px-6">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mr-4 rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-300 hover:bg-white/10 lg:hidden"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Header />
        </div>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
