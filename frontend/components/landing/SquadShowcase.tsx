import { getTranslations, getLocale } from 'next-intl/server'
import { Instagram, Linkedin, BookOpen } from 'lucide-react'

const mockSquads = [
  {
    id: 'instagram-carousel',
    price: 49,
    icon: Instagram,
    color: 'bg-pink-100 text-pink-600',
  },
  {
    id: 'linkedin-posts',
    price: 39,
    icon: Linkedin,
    color: 'bg-blue-100 text-blue-600',
  },
  {
    id: 'tutorial-generator',
    price: 59,
    icon: BookOpen,
    color: 'bg-green-100 text-green-600',
  },
]

export default async function SquadShowcase() {
  const t = await getTranslations('squadShowcase')
  const locale = await getLocale()
  const isPortuguese = locale === 'pt-BR'

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {mockSquads.map((squad) => (
            <div
              key={squad.id}
              className="rounded-xl border border-slate-200 bg-white overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className={`h-32 ${squad.color} flex items-center justify-center`}>
                <squad.icon className="w-12 h-12" />
              </div>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {t(`squads.${squad.id}.name`)}
                </h3>
                <p className="text-slate-600 text-sm mb-4">
                  {t(`squads.${squad.id}.description`)}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-slate-900">
                    R$ {squad.price}
                    <span className="text-sm font-normal text-slate-500">{isPortuguese ? '/mês' : '/month'}</span>
                  </span>
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
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
