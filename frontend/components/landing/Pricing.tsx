import { getTranslations } from 'next-intl/server'
import { Check } from 'lucide-react'

export default async function Pricing() {
  const t = await getTranslations('pricing')

  return (
    <section className="py-20 bg-slate-900 text-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('title')}
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-2">
            {t('subtitle')}
          </p>
          <p className="text-slate-500 max-w-2xl mx-auto">
            {t('description')}
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold mb-2">{t('plan.name')}</h3>
              <div className="flex items-baseline justify-center">
                <span className="text-4xl font-bold text-white">R$ 39</span>
                <span className="text-slate-400 ml-1">{t('perMonth')}</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {t.raw('plan.features').map((feature: string, index: number) => (
                <li key={index} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span className="text-slate-300">{feature}</span>
                </li>
              ))}
            </ul>

            <button className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
              {t('plan.cta')}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
