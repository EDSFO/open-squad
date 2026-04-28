'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/button'
import { Input, FormField, Form } from '@/components/ui/form-components'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const t = useTranslations('auth.login')
  const router = useRouter()
  const locale = useLocale()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Login failed')
      }

      localStorage.setItem('token', result.token)
      router.push(`/${locale}/dashboard`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthCard
      title={t('title')}
      footerText={t('noAccount')}
      footerHref={`/${locale}/auth/register`}
      footerLink={t('link')}
    >
      <Form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          name="email"
          label={t('email')}
          error={errors.email?.message}
        >
          <Input
            type="email"
            placeholder="email@example.com"
            {...register('email')}
            error={!!errors.email}
          />
        </FormField>

        <FormField
          name="password"
          label={t('password')}
          error={errors.password?.message}
        >
          <Input
            type="password"
            placeholder="********"
            {...register('password')}
            error={!!errors.password}
          />
        </FormField>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? '...' : t('submit')}
        </Button>
      </Form>
    </AuthCard>
  )
}
