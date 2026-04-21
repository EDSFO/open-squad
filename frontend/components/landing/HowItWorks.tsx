import { getTranslations } from 'next-intl/server'
import { Rocket, UserPlus, Users } from 'lucide-react'

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
    <section id="workflow" className="py-20 md:py-28">
      <div className="section-shell">
        <div className="mb-14">
          <span className="eyebrow">Workflow</span>
          <h2 className="section-title mt-5">{t('title')}</h2>
          <p className="section-copy mt-4">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="panel relative p-7">
              <div className="mb-10 flex items-center justify-between">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#ef233c]/10 text-[#ef233c]">
                  <step.icon className="h-7 w-7" />
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Step</p>
                  <p className="text-3xl font-semibold text-white">0{index + 1}</p>
                </div>
              </div>
              <h3 className="mb-3 text-2xl font-semibold text-white">{step.title}</h3>
              <p className="leading-7 text-zinc-400">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
