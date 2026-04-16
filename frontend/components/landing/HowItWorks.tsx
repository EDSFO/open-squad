import { getTranslations } from 'next-intl/server'
import { UserPlus, Users, Rocket } from 'lucide-react'

export default async function HowItWorks() {
  const t = await getTranslations('howItWorks')

  const steps = [
    {
      icon: UserPlus,
      title: t('step1'),
      description: t('step1Desc'),
    },
    {
      icon: Users,
      title: t('step2'),
      description: t('step2Desc'),
    },
    {
      icon: Rocket,
      title: t('step3'),
      description: t('step3Desc'),
    },
  ]

  return (
    <section className="py-20 bg-slate-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            {t('title')}
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="relative text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 text-white mb-6">
                <step.icon className="w-8 h-8" />
              </div>
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-[2px] bg-slate-300" />
              )}
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {step.title}
              </h3>
              <p className="text-slate-600">
                {step.description}
              </p>
              <div className="mt-4 inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-slate-600 font-semibold text-sm">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
