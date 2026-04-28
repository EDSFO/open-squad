import Link from 'next/link'
import { Bot } from 'lucide-react'

interface AuthCardProps {
  title: string
  children: React.ReactNode
  footerText: string
  footerHref: string
  footerLink: string
}

export function AuthCard({
  title,
  children,
  footerText,
  footerHref,
  footerLink,
}: AuthCardProps) {
  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-4 py-10">
      <section className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/" className="mb-5 flex items-center gap-3">
            <div className="grid h-11 w-11 grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5">
              <span className="rounded-md bg-[#ef233c]" />
              <span className="rounded-md bg-zinc-700" />
              <span className="rounded-md bg-zinc-800" />
              <span className="rounded-md bg-white" />
            </div>
            <div className="text-left">
              <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">Open Squad</p>
              <p className="text-lg font-semibold text-white">AI Operating System</p>
            </div>
          </Link>
          <h1 className="text-4xl font-semibold leading-none text-white">{title}</h1>
        </div>

        <div className="panel relative overflow-hidden rounded-3xl p-6 md:p-8">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-[#ef233c]">
            <Bot className="h-5 w-5" />
          </div>

          <div className="pt-12">{children}</div>

          <p className="mt-6 text-center text-sm text-zinc-400">
            {footerText}{' '}
            <Link href={footerHref} className="font-semibold text-white transition-colors hover:text-[#ef233c]">
              {footerLink}
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
