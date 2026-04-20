'use client'

import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Store, Users, Settings, Library, BriefcaseBusiness } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard/marketplace', labelKey: 'marketplace', icon: Store },
  { href: '/dashboard/meus-squads', labelKey: 'meuSquads', icon: Users },
  { href: '/dashboard/admin/squads', labelKey: 'authorStudio', icon: BriefcaseBusiness },
  { href: '/dashboard/library', labelKey: 'library', icon: Library },
  { href: '/dashboard/settings', labelKey: 'settings', icon: Settings },
]

export function Sidebar() {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const locale = pathname.startsWith('/pt-BR') ? 'pt-BR' : 'en-US'
  const withLocale = (href: string) => `/${locale}${href}`

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200 bg-white">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-slate-200 px-6">
          <Link href={withLocale('/dashboard')} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <span className="text-sm font-bold text-white">OS</span>
            </div>
            <span className="text-lg font-semibold text-slate-900">Opensquad</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const localizedHref = withLocale(item.href)
            const isActive = pathname === localizedHref || pathname.startsWith(localizedHref + '/')
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={localizedHref}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Icon className="h-5 w-5" />
                {t(item.labelKey)}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4">
          <p className="text-xs text-slate-500">
            {t('version')} 1.0.0
          </p>
        </div>
      </div>
    </aside>
  )
}
