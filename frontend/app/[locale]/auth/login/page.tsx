'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input, Label, FormField, Form } from '@/components/ui/form-components'

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900">{t('title')}</h1>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6">
          <Form onSubmit={handleSubmit(onSubmit)}>
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
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? '...' : t('submit')}
            </Button>
          </Form>

          <p className="text-center text-sm text-slate-600">
            {t('noAccount')}{' '}
            <Link href={`/${locale}/auth/register`} className="text-blue-600 hover:underline">
              {t('link')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
