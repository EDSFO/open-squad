'use client'

import { useTranslations } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { User, ChevronDown, LogOut, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

  // Close menus when clicking outside
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
    // Replace current locale in pathname with new locale
    const newPathname = pathname.replace(/^\/(pt-BR|en-US)/, `/${locale}`)
    router.push(newPathname)
    setLocaleMenuOpen(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push(`/${currentLocale}/auth/login`)
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      {/* Left side - could add breadcrumb or page title here */}
      <div />

      {/* Right side - user menu and locale switcher */}
      <div className="flex items-center gap-4">
        {/* Locale Switcher */}
        <div className="relative" ref={localeMenuRef}>
          <button
            onClick={() => setLocaleMenuOpen(!localeMenuOpen)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <Globe className="h-4 w-4" />
            {currentLocale === 'pt-BR' ? 'PT-BR' : 'EN-US'}
            <ChevronDown className="h-4 w-4" />
          </button>

          {localeMenuOpen && (
            <div className="absolute right-0 mt-2 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <button
                onClick={() => handleLocaleSwitch('pt-BR')}
                className={cn(
                  'flex w-full items-center px-4 py-2 text-sm hover:bg-slate-100',
                  currentLocale === 'pt-BR' ? 'text-blue-600 font-medium' : 'text-slate-600'
                )}
              >
                Português (BR)
              </button>
              <button
                onClick={() => handleLocaleSwitch('en-US')}
                className={cn(
                  'flex w-full items-center px-4 py-2 text-sm hover:bg-slate-100',
                  currentLocale === 'en-US' ? 'text-blue-600 font-medium' : 'text-slate-600'
                )}
              >
                English (US)
              </button>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100"
          >
            {/* Avatar placeholder */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200">
              <User className="h-4 w-4 text-slate-500" />
            </div>
            <span className="text-sm font-medium text-slate-700">{userName}</span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
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
