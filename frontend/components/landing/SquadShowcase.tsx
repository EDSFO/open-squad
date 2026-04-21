import { getLocale, getTranslations } from 'next-intl/server'
import { BookOpen, Instagram, Linkedin } from 'lucide-react'

const mockSquads = [
  {
    id: 'instagram-carousel',
    price: 49,
    icon: Instagram,
    color: 'bg-[#ef233c]/12 text-[#ff758f]',
  },
  {
    id: 'linkedin-posts',
    price: 39,
    icon: Linkedin,
    color: 'bg-white/10 text-white',
  },
  {
    id: 'tutorial-generator',
    price: 59,
    icon: BookOpen,
    color: 'bg-emerald-400/12 text-emerald-300',
  },
]

export default async function SquadShowcase() {
  const t = await getTranslations('squadShowcase')
  const locale = await getLocale()
  const isPortuguese = locale === 'pt-BR'

  return (
    <section className="py-20 md:py-28">
      <div className="section-shell">
        <div className="mb-14 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="eyebrow">Marketplace</span>
            <h2 className="section-title mt-5">{t('title')}</h2>
          </div>
          <p className="section-copy">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {mockSquads.map((squad, index) => (
            <div key={squad.id} className="panel overflow-hidden">
              <div className="relative border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(239,35,60,0.2),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6">
                <div className="mb-10 flex items-center justify-between">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 ${squad.color}`}>
                    <squad.icon className="h-7 w-7" />
                  </div>
                  <span className="text-xs uppercase tracking-[0.28em] text-zinc-500">0{index + 1}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[...Array(8)].map((_, cardIndex) => (
                    <div key={cardIndex} className="aspect-[4/5] rounded-xl border border-white/10 bg-white/[0.04]" />
                  ))}
                </div>
              </div>

              <div className="p-6">
                <h3 className="mb-2 text-lg font-semibold text-white">{t(`squads.${squad.id}.name`)}</h3>
                <p className="mb-6 text-sm leading-6 text-zinc-400">{t(`squads.${squad.id}.description`)}</p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-white">
                    R$ {squad.price}
                    <span className="ml-1 text-sm font-normal text-zinc-500">
                      {isPortuguese ? '/mês' : '/month'}
                    </span>
                  </span>
                  <button className="text-sm font-medium text-[#ef233c] transition-colors hover:text-[#ff758f]">
                    {t('viewDetails')} →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
