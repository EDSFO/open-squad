import { getLocale, getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { ArrowRight, Bot, Globe, ShieldCheck, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function Hero() {
  const t = await getTranslations('hero')
  const locale = await getLocale()
  const isPortuguese = locale === 'pt-BR'

  return (
    <section className="relative overflow-hidden pb-20 pt-6 md:pb-28 md:pt-8">
      <div className="section-shell">
        <div className="panel mb-12 flex items-center justify-between gap-4 px-5 py-4 md:px-8">
          <Link href={`/${locale}`} className="flex items-center gap-3">
            <div className="grid h-10 w-10 grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5">
              <span className="rounded-md bg-[#ef233c]" />
              <span className="rounded-md bg-zinc-700" />
              <span className="rounded-md bg-zinc-800" />
              <span className="rounded-md bg-white" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">Open Squad</p>
              <p className="text-lg font-semibold text-white">AI Operating System</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-zinc-400 md:flex">
            <a href="#features" className="transition-colors hover:text-white">
              {isPortuguese ? 'Recursos' : 'Features'}
            </a>
            <a href="#workflow" className="transition-colors hover:text-white">
              {isPortuguese ? 'Fluxo' : 'Workflow'}
            </a>
            <a href="#pricing" className="transition-colors hover:text-white">
              {isPortuguese ? 'Planos' : 'Pricing'}
            </a>
          </nav>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-8">
            <div className="eyebrow">
              <Bot className="h-4 w-4 text-[#ef233c]" />
              <span>
                {isPortuguese
                  ? 'Coordene agentes com clareza operacional'
                  : 'Coordinate agents with operational clarity'}
              </span>
            </div>

            <div className="max-w-4xl">
              <h1 className="text-5xl font-semibold leading-[0.94] text-white md:text-7xl">
                {t('title')}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400 md:text-xl">
                {t('subtitle')}
              </p>
            </div>

            <div className="flex flex-col items-start gap-4 sm:flex-row">
              <Link href={`/${locale}/auth/register`}>
                <Button size="lg" className="gap-2">
                  {t('cta')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href={`/${locale}/auth/register`}>
                <Button variant="outline" size="lg">
                  {t('link')}
                </Button>
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                { icon: Bot, label: t('features.multiagent.label'), sublabel: t('features.multiagent.sublabel') },
                { icon: Zap, label: t('features.checkpoint.label'), sublabel: t('features.checkpoint.sublabel') },
                { icon: Globe, label: t('features.languages.label'), sublabel: t('features.languages.sublabel') },
              ].map((item) => (
                <div key={item.label} className="panel-soft p-4">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
                    <item.icon className="h-5 w-5 text-[#ef233c]" />
                  </div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white">{item.label}</p>
                  <p className="mt-1 text-sm text-zinc-400">{item.sublabel}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel relative overflow-hidden p-6 md:p-8">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">
                  {isPortuguese ? 'Sala de comando' : 'Command room'}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {isPortuguese ? 'Operação em tempo real' : 'Real-time operation'}
                </h2>
              </div>
              <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
                Live
              </div>
            </div>

            <div className="space-y-4">
              {[
                {
                  icon: ShieldCheck,
                  title: isPortuguese ? 'Checkpoint com aprovação' : 'Approval checkpoints',
                  copy: isPortuguese
                    ? 'Cada etapa crítica pode parar para revisão antes de publicar.'
                    : 'Critical steps can stop for review before publishing.',
                },
                {
                  icon: Zap,
                  title: isPortuguese ? 'Execução paralela' : 'Parallel execution',
                  copy: isPortuguese
                    ? 'Agentes escrevem, refinam e montam assets no mesmo fluxo.'
                    : 'Agents write, refine, and assemble assets in one flow.',
                },
                {
                  icon: Globe,
                  title: isPortuguese ? 'Saídas bilíngues' : 'Bilingual outputs',
                  copy: isPortuguese
                    ? 'Operação nativa em PT-BR e EN-US sem trocar de stack.'
                    : 'Native PT-BR and EN-US operation without switching stacks.',
                },
              ].map((item, index) => (
                <div key={item.title} className="rounded-[22px] border border-white/10 bg-black/30 p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ef233c]/12 text-[#ef233c]">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs uppercase tracking-[0.28em] text-zinc-500">0{index + 1}</span>
                      <p className="text-base font-semibold text-white">{item.title}</p>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-zinc-400">{item.copy}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                ['24/7', isPortuguese ? 'orquestração' : 'orchestration'],
                ['+50', isPortuguese ? 'execuções/mês' : 'runs/month'],
                ['2', isPortuguese ? 'idiomas nativos' : 'native locales'],
              ].map(([value, label]) => (
                <div key={value} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                  <p className="text-2xl font-semibold text-white">{value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
