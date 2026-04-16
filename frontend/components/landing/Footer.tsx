import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Bot } from 'lucide-react'

export default async function Footer() {
  const t = await getTranslations('footer')

  return (
    <footer className="bg-slate-900 text-slate-300 py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Bot className="w-6 h-6 text-white" />
              <span className="text-xl font-bold text-white">Opensquad</span>
            </div>
            <p className="text-sm text-slate-400">
              {t('description')}
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">{t('product')}</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/#features" className="text-sm hover:text-white transition-colors">
                  {t('features')}
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="text-sm hover:text-white transition-colors">
                  {t('pricing')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">{t('company')}</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-sm hover:text-white transition-colors">
                  {t('about')}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm hover:text-white transition-colors">
                  {t('contact')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">{t('legal')}</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-sm hover:text-white transition-colors">
                  {t('privacy')}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm hover:text-white transition-colors">
                  {t('terms')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
          <p>© {new Date().getFullYear()} Opensquad. {t('rights')}.</p>
        </div>
      </div>
    </footer>
  )
}
