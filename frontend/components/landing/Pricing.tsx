import { getLocale, getTranslations } from 'next-intl/server'
import { Check } from 'lucide-react'

export default async function Pricing() {
  const locale = await getLocale()
  const t = await getTranslations('pricing')
  const isPortuguese = locale === 'pt-BR'

  return (
    <section id="pricing" className="py-20 md:py-28">
      <div className="section-shell">
        <div className="mb-14">
          <span className="eyebrow">Pricing</span>
          <h2 className="section-title mt-5">{t('title')}</h2>
          <p className="section-copy mt-4">{t('description')}</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="panel p-8">
            <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">{t('subtitle')}</p>
            <div className="mt-6 flex items-end gap-3">
              <span className="text-6xl font-semibold text-white">R$ 39</span>
              <span className="pb-2 text-zinc-500">{t('perMonth')}</span>
            </div>
            <p className="mt-6 text-sm leading-7 text-zinc-400">
              {isPortuguese
                ? `${t('plan.name')} para operar seus squads com controle, checkpoint e biblioteca centralizada.`
                : `${t('plan.name')} to run your squads with approval control, checkpoints, and a centralized library.`}
            </p>
          </div>

          <div className="panel p-8">
            <div className="mb-8 flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-white">{t('plan.name')}</h3>
              <span className="rounded-full border border-[#ef233c]/30 bg-[#ef233c]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#ff758f]">
                {t('popular')}
              </span>
            </div>

            <ul className="grid gap-4 md:grid-cols-2">
              {t.raw('plan.features').map((feature: string, index: number) => (
                <li key={index} className="panel-soft flex items-center gap-3 px-4 py-4">
                  <Check className="h-5 w-5 flex-shrink-0 text-emerald-400" />
                  <span className="text-zinc-200">{feature}</span>
                </li>
              ))}
            </ul>

            <button className="mt-8 w-full rounded-full border border-[#ef233c] bg-[#ef233c] px-6 py-3 font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#d90429]">
              {t('plan.cta')}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
