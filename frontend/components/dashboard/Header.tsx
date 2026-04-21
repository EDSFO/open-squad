'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, Globe, LogOut, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  userName?: string
}

export function Header({ userName = 'User' }: HeaderProps) {
  const t = useTranslations()
  const router = useRouter()
  const pathname = usePathname()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [localeMenuOpen, setLocaleMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const localeMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
      if (localeMenuRef.current && !localeMenuRef.current.contains(event.target as Node)) {
        setLocaleMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentLocale = pathname.startsWith('/pt-BR') ? 'pt-BR' : 'en-US'

  const handleLocaleSwitch = (locale: string) => {
    const newPathname = pathname.replace(/^\/(pt-BR|en-US)/, `/${locale}`)
    router.push(newPathname)
    setLocaleMenuOpen(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push(`/${currentLocale}/auth/login`)
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between bg-transparent px-0">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Workspace</p>
        <p className="text-sm font-medium text-white">Opensquad Control Center</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative" ref={localeMenuRef}>
          <button
            onClick={() => setLocaleMenuOpen(!localeMenuOpen)}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-white/10 hover:text-white"
          >
            <Globe className="h-4 w-4" />
            {currentLocale === 'pt-BR' ? 'PT-BR' : 'EN-US'}
            <ChevronDown className="h-4 w-4" />
          </button>

          {localeMenuOpen && (
            <div className="absolute right-0 mt-2 w-40 rounded-2xl border border-white/10 bg-zinc-950 py-2 shadow-2xl">
              <button
                onClick={() => handleLocaleSwitch('pt-BR')}
                className={cn(
                  'flex w-full items-center px-4 py-2 text-sm hover:bg-white/5',
                  currentLocale === 'pt-BR' ? 'font-medium text-[#ff758f]' : 'text-zinc-400'
                )}
              >
                Portugues (BR)
              </button>
              <button
                onClick={() => handleLocaleSwitch('en-US')}
                className={cn(
                  'flex w-full items-center px-4 py-2 text-sm hover:bg-white/5',
                  currentLocale === 'en-US' ? 'font-medium text-[#ff758f]' : 'text-zinc-400'
                )}
              >
                English (US)
              </button>
            </div>
          )}
        </div>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ef233c]/12">
              <User className="h-4 w-4 text-[#ff758f]" />
            </div>
            <span className="text-sm font-medium text-white">{userName}</span>
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-white/10 bg-zinc-950 py-2 shadow-2xl">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4" />
                {t('nav.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
