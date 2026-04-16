import { getLocale, getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Bot, Zap, Shield, Globe } from 'lucide-react'

export default async function Hero() {
  const t = await getTranslations('hero')
  const locale = await getLocale()

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white py-20 md:py-32">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Bot className="w-8 h-8 text-blue-600" />
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
              AI-Powered
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            {t('title')}
          </h1>

          <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={`/${locale}/auth/register`}>
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8">
                {t('cta')}
              </Button>
            </Link>
            <Link href={`/${locale}/auth/register`}>
              <Button variant="outline" size="lg" className="px-8">
                {t('link')}
              </Button>
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 justify-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Bot className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-900">{t('features.multiagent.label')}</p>
                <p className="text-sm text-slate-500">{t('features.multiagent.sublabel')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 justify-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-900">{t('features.checkpoint.label')}</p>
                <p className="text-sm text-slate-500">{t('features.checkpoint.sublabel')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 justify-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Globe className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-900">{t('features.languages.label')}</p>
                <p className="text-sm text-slate-500">{t('features.languages.sublabel')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
