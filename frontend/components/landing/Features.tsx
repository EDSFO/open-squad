import { getTranslations } from 'next-intl/server'
import { Bot, CheckCircle, Languages, CreditCard } from 'lucide-react'

export default async function Features() {
  const t = await getTranslations('features')

  const features = [
    {
      icon: Bot,
      title: t('multiAgent.title'),
      description: t('multiAgent.description'),
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: CheckCircle,
      title: t('checkpoint.title'),
      description: t('checkpoint.description'),
      color: 'bg-green-100 text-green-600',
    },
    {
      icon: Languages,
      title: t('languages.title'),
      description: t('languages.description'),
      color: 'bg-purple-100 text-purple-600',
    },
    {
      icon: CreditCard,
      title: t('payments.title'),
      description: t('payments.description'),
      color: 'bg-orange-100 text-orange-600',
    },
  ]

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            {t('title')}
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-xl border border-slate-100 bg-slate-50 hover:shadow-lg transition-shadow"
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${feature.color}`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-600 text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
