import Hero from '@/components/landing/Hero'
import Features from '@/components/landing/Features'
import HowItWorks from '@/components/landing/HowItWorks'
import SquadShowcase from '@/components/landing/SquadShowcase'
import Pricing from '@/components/landing/Pricing'
import FAQ from '@/components/landing/FAQ'
import Footer from '@/components/landing/Footer'

export default function Home() {
  return (
    <main>
      <Hero />
      <Features />
      <HowItWorks />
      <SquadShowcase />
      <Pricing />
      <FAQ />
      <Footer />
    </main>
  )
}
