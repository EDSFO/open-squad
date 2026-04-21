'use client'

import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { BriefcaseBusiness, Library, Settings, Store, Users } from 'lucide-react'
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
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center border-b border-white/10 px-6">
          <Link href={withLocale('/dashboard')} className="flex items-center gap-3">
            <div className="grid h-10 w-10 grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5">
              <span className="rounded-md bg-[#ef233c]" />
              <span className="rounded-md bg-zinc-700" />
              <span className="rounded-md bg-zinc-800" />
              <span className="rounded-md bg-white" />
            </div>
            <span className="text-lg font-semibold text-white">Opensquad</span>
          </Link>
        </div>

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
                  'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border border-[#ef233c]/20 bg-[#ef233c]/12 text-white'
                    : 'border border-transparent text-zinc-400 hover:border-white/10 hover:bg-white/5 hover:text-white'
                )}
              >
                <Icon className="h-5 w-5" />
                {t(item.labelKey)}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
            {t('version')} 1.0.0
          </p>
        </div>
      </div>
    </aside>
  )
}
