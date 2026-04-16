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

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const t = useTranslations('auth.register')
  const router = useRouter()
  const locale = useLocale()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const { confirmPassword: _, ...payload } = data
      const response = await fetch(`${BACKEND_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Registration failed')
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
              name="name"
              label={t('name')}
              error={errors.name?.message}
            >
              <Input
                type="text"
                placeholder="John Doe"
                {...register('name')}
                error={!!errors.name}
              />
            </FormField>

            <FormField
              name="email"
              label={t('email')}
              error={errors.email?.message || error || undefined}
            >
              <Input
                type="email"
                placeholder="email@example.com"
                {...register('email')}
                error={!!errors.email || !!error}
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

            <FormField
              name="confirmPassword"
              label={t('confirmPassword')}
              error={errors.confirmPassword?.message}
            >
              <Input
                type="password"
                placeholder="********"
                {...register('confirmPassword')}
                error={!!errors.confirmPassword}
              />
            </FormField>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? '...' : t('submit')}
            </Button>
          </Form>

          <p className="text-center text-sm text-slate-600">
            {t('hasAccount')}{' '}
            <Link href={`/${locale}/auth/login`} className="text-blue-600 hover:underline">
              {t('link')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
