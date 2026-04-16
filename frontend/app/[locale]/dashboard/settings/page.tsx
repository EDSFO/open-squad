'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, FormField, Form } from '@/components/ui/form-components'
import { BillingPortal } from '@/components/dashboard/BillingPortal'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

interface UserProfile {
  id: string
  name: string
  email: string
  locale: string
  stripeCustomerId: string | null
  subscriptionId: string | null
}

const profileSchema = z.object({
  name: z.string().min(1),
  locale: z.enum(['pt-BR', 'en-US']),
})

type ProfileFormData = z.infer<typeof profileSchema>

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type PasswordFormData = z.infer<typeof passwordSchema>

export default function SettingsPage() {
  const t = useTranslations('settings')
  const tNav = useTranslations('nav')

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)

  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
    setValue: setProfileValue,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  })

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setIsLoadingProfile(true)
    setProfileError(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No token found')
      }

      const response = await fetch(`${BACKEND_URL}/user/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }

      const data = await response.json()
      setProfile(data.user)
      setProfileValue('name', data.user.name)
      setProfileValue('locale', data.user.locale || 'pt-BR')
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const onProfileSubmit = async (data: ProfileFormData) => {
    setIsSavingProfile(true)
    setProfileSuccess(false)
    setProfileError(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No token found')
      }

      const response = await fetch(`${BACKEND_URL}/user/me`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setIsChangingPassword(true)
    setPasswordSuccess(false)
    setPasswordError(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No token found')
      }

      const response = await fetch(`${BACKEND_URL}/user/me/password`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          oldPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to change password')
      }

      setPasswordSuccess(true)
      resetPassword()
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsChangingPassword(false)
    }
  }

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-slate-600">{t('subtitle')}</p>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('profile.title')}</h2>

        {profileError && !isLoadingProfile && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {profileError}
          </div>
        )}

        {profileSuccess && (
          <div className="mb-4 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md px-3 py-2">
            {t('profile.saved')}
          </div>
        )}

        <Form onSubmit={handleSubmitProfile(onProfileSubmit)}>
          <div className="space-y-4">
            <FormField
              name="name"
              label={t('profile.name')}
              error={profileErrors.name?.message}
            >
              <Input
                {...registerProfile('name')}
                type="text"
                error={!!profileErrors.name}
              />
            </FormField>

            <FormField
              name="email"
              label={t('profile.email')}
            >
              <Input
                type="email"
                value={profile?.email || ''}
                readOnly
                disabled
                className="bg-slate-50 cursor-not-allowed"
              />
            </FormField>

            <FormField
              name="locale"
              label={t('locale.label')}
              error={profileErrors.locale?.message}
            >
              <select
                {...registerProfile('locale')}
                className="w-full h-10 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="pt-BR">{t('locale.ptBR')}</option>
                <option value="en-US">{t('locale.enUS')}</option>
              </select>
            </FormField>
          </div>

          <Button
            type="submit"
            className="mt-6 bg-blue-600 hover:bg-blue-700"
            disabled={isSavingProfile}
          >
            {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : t('save')}
          </Button>
        </Form>
      </div>

      {/* Password Section */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('password.title')}</h2>

        {passwordError && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {passwordError}
          </div>
        )}

        {passwordSuccess && (
          <div className="mb-4 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md px-3 py-2">
            {t('password.saved')}
          </div>
        )}

        <Form onSubmit={handleSubmitPassword(onPasswordSubmit)}>
          <div className="space-y-4">
            <FormField
              name="currentPassword"
              label={t('password.current')}
              error={passwordErrors.currentPassword?.message}
            >
              <Input
                {...registerPassword('currentPassword')}
                type="password"
                error={!!passwordErrors.currentPassword}
              />
            </FormField>

            <FormField
              name="newPassword"
              label={t('password.new')}
              error={passwordErrors.newPassword?.message}
            >
              <Input
                {...registerPassword('newPassword')}
                type="password"
                error={!!passwordErrors.newPassword}
              />
            </FormField>

            <FormField
              name="confirmPassword"
              label={t('password.confirm')}
              error={passwordErrors.confirmPassword?.message}
            >
              <Input
                {...registerPassword('confirmPassword')}
                type="password"
                error={!!passwordErrors.confirmPassword}
              />
            </FormField>
          </div>

          <Button
            type="submit"
            className="mt-6 bg-blue-600 hover:bg-blue-700"
            disabled={isChangingPassword}
          >
            {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : t('password.change')}
          </Button>
        </Form>
      </div>

      {/* Billing Section */}
      <BillingPortal hasSubscription={!!profile?.subscriptionId} />
    </div>
  )
}