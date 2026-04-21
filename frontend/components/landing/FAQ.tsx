'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown } from 'lucide-react'

interface FAQItemProps {
  question: string
  answer: string
  isOpen: boolean
  onClick: () => void
}

function FAQItem({ question, answer, isOpen, onClick }: FAQItemProps) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-5">
      <button className="flex w-full items-center justify-between py-5 text-left" onClick={onClick}>
        <span className="pr-4 font-medium text-white">{question}</span>
        <ChevronDown className={`h-5 w-5 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="pb-5 leading-7 text-zinc-400">{answer}</div>}
    </div>
  )
}

export default function FAQ() {
  const t = useTranslations('faq')
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqs = [
    { q: t('q1'), a: t('a1') },
    { q: t('q2'), a: t('a2') },
    { q: t('q3'), a: t('a3') },
    { q: t('q4'), a: t('a4') },
  ]

  return (
    <section className="py-20 md:py-28">
      <div className="section-shell">
        <div className="mb-12">
          <span className="eyebrow">FAQ</span>
          <h2 className="section-title mt-5">{t('title')}</h2>
          <p className="section-copy mt-4">{t('subtitle')}</p>
        </div>

        <div className="panel mx-auto max-w-3xl p-6 md:p-8">
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.q}
                answer={faq.a}
                isOpen={openIndex === index}
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
