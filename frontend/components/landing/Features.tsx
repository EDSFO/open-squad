import { getTranslations } from 'next-intl/server'
import { Bot, CheckCircle, CreditCard, Languages } from 'lucide-react'

export default async function Features() {
  const t = await getTranslations('features')

  const features = [
    {
      icon: Bot,
      title: t('multiAgent.title'),
      description: t('multiAgent.description'),
      color: 'bg-[#ef233c]/12 text-[#ff758f]',
    },
    {
      icon: CheckCircle,
      title: t('checkpoint.title'),
      description: t('checkpoint.description'),
      color: 'bg-emerald-400/12 text-emerald-300',
    },
    {
      icon: Languages,
      title: t('languages.title'),
      description: t('languages.description'),
      color: 'bg-white/10 text-white',
    },
    {
      icon: CreditCard,
      title: t('payments.title'),
      description: t('payments.description'),
      color: 'bg-amber-400/12 text-amber-200',
    },
  ]

  return (
    <section id="features" className="py-20 md:py-28">
      <div className="section-shell">
        <div className="mb-14 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="eyebrow">System Modules</span>
            <h2 className="section-title mt-5">{t('title')}</h2>
          </div>
          <p className="section-copy">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.title} className="panel group p-6 transition-transform duration-300 hover:-translate-y-1">
              <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 ${feature.color}`}>
                <feature.icon className="h-6 w-6" />
              </div>
              <div className="mb-6 h-px w-full bg-gradient-to-r from-white/20 to-transparent" />
              <h3 className="mb-3 text-xl font-semibold text-white">{feature.title}</h3>
              <p className="text-sm leading-6 text-zinc-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
