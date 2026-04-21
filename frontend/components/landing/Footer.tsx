import { getLocale, getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Bot } from 'lucide-react'

export default async function Footer() {
  const locale = await getLocale()
  const t = await getTranslations('footer')

  return (
    <footer className="pb-10 pt-8">
      <div className="section-shell">
        <div className="panel overflow-hidden">
          <div className="grid gap-0 border-b border-white/10 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="border-b border-white/10 p-8 lg:border-b-0 lg:border-r lg:border-white/10 lg:p-10">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-11 w-11 grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5">
                  <span className="rounded-md bg-[#ef233c]" />
                  <span className="rounded-md bg-zinc-700" />
                  <span className="rounded-md bg-zinc-800" />
                  <span className="rounded-md bg-white" />
                </div>
                <span className="text-2xl font-semibold text-white">Opensquad</span>
              </div>

              <p className="max-w-sm text-sm leading-7 text-zinc-400">{t('description')}</p>

              <div className="mt-8 flex items-center gap-3 text-zinc-500">
                <Bot className="h-5 w-5 text-[#ef233c]" />
                <span className="text-xs uppercase tracking-[0.3em]">Multi-agent content ops</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 p-8 md:grid-cols-3 lg:p-10">
              <div>
                <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-[#ff758f]">{t('product')}</h4>
                <div className="space-y-3">
                  <Link href={`/${locale}/#features`} className="block text-sm text-zinc-400 transition-colors hover:text-white">
                    {t('features')}
                  </Link>
                  <Link href={`/${locale}/#pricing`} className="block text-sm text-zinc-400 transition-colors hover:text-white">
                    {t('pricing')}
                  </Link>
                </div>
              </div>

              <div>
                <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-[#ff758f]">{t('company')}</h4>
                <div className="space-y-3">
                  <Link href={`/${locale}/about`} className="block text-sm text-zinc-400 transition-colors hover:text-white">
                    {t('about')}
                  </Link>
                  <Link href={`/${locale}/contact`} className="block text-sm text-zinc-400 transition-colors hover:text-white">
                    {t('contact')}
                  </Link>
                </div>
              </div>

              <div>
                <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-[#ff758f]">{t('legal')}</h4>
                <div className="space-y-3">
                  <Link href={`/${locale}/privacy`} className="block text-sm text-zinc-400 transition-colors hover:text-white">
                    {t('privacy')}
                  </Link>
                  <Link href={`/${locale}/terms`} className="block text-sm text-zinc-400 transition-colors hover:text-white">
                    {t('terms')}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden px-6 py-12 text-center md:px-10">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:28px_28px] opacity-60" />
            <p className="relative text-[13vw] font-semibold leading-none tracking-[-0.08em] text-transparent [text-stroke:1px_rgba(255,255,255,0.18)]">
              OPENSQUAD
            </p>
          </div>

          <div className="border-t border-white/10 px-6 py-5 text-center text-xs uppercase tracking-[0.24em] text-zinc-500 md:px-10">
            {'\u00A9'} {new Date().getFullYear()} Opensquad. {t('rights')}.
          </div>
        </div>
      </div>
    </footer>
  )
}
