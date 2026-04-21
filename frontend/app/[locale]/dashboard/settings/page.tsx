'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Form, FormField, Input } from '@/components/ui/form-components'
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
    void fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setIsLoadingProfile(true)
    setProfileError(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('No token found')

      const response = await fetch(`${BACKEND_URL}/user/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error('Failed to fetch profile')

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
      if (!token) throw new Error('No token found')

      const response = await fetch(`${BACKEND_URL}/user/me`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error('Failed to update profile')

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
      if (!token) throw new Error('No token found')

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
      if (!response.ok) throw new Error(result.message || 'Failed to change password')

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
        <Loader2 className="h-8 w-8 animate-spin text-[#ef233c]" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="dashboard-title">{t('title')}</h1>
        <p className="dashboard-subtitle">{t('subtitle')}</p>
      </div>

      <div className="dashboard-card">
        <h2 className="mb-4 text-lg font-semibold text-white">{t('profile.title')}</h2>

        {profileError && !isLoadingProfile && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {profileError}
          </div>
        )}

        {profileSuccess && (
          <div className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">
            {t('profile.saved')}
          </div>
        )}

        <Form onSubmit={handleSubmitProfile(onProfileSubmit)}>
          <div className="space-y-4">
            <FormField name="name" label={t('profile.name')} error={profileErrors.name?.message}>
              <Input {...registerProfile('name')} type="text" error={!!profileErrors.name} />
            </FormField>

            <FormField name="email" label={t('profile.email')}>
              <Input type="email" value={profile?.email || ''} readOnly disabled className="bg-zinc-900/70 text-zinc-500" />
            </FormField>

            <FormField name="locale" label={t('locale.label')} error={profileErrors.locale?.message}>
              <select {...registerProfile('locale')} className="dashboard-input h-11">
                <option value="pt-BR">{t('locale.ptBR')}</option>
                <option value="en-US">{t('locale.enUS')}</option>
              </select>
            </FormField>
          </div>

          <Button type="submit" className="mt-6" disabled={isSavingProfile}>
            {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : t('save')}
          </Button>
        </Form>
      </div>

      <div className="dashboard-card">
        <h2 className="mb-4 text-lg font-semibold text-white">{t('password.title')}</h2>

        {passwordError && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {passwordError}
          </div>
        )}

        {passwordSuccess && (
          <div className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">
            {t('password.saved')}
          </div>
        )}

        <Form onSubmit={handleSubmitPassword(onPasswordSubmit)}>
          <div className="space-y-4">
            <FormField name="currentPassword" label={t('password.current')} error={passwordErrors.currentPassword?.message}>
              <Input {...registerPassword('currentPassword')} type="password" error={!!passwordErrors.currentPassword} />
            </FormField>

            <FormField name="newPassword" label={t('password.new')} error={passwordErrors.newPassword?.message}>
              <Input {...registerPassword('newPassword')} type="password" error={!!passwordErrors.newPassword} />
            </FormField>

            <FormField name="confirmPassword" label={t('password.confirm')} error={passwordErrors.confirmPassword?.message}>
              <Input {...registerPassword('confirmPassword')} type="password" error={!!passwordErrors.confirmPassword} />
            </FormField>
          </div>

          <Button type="submit" className="mt-6" disabled={isChangingPassword}>
            {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : t('password.change')}
          </Button>
        </Form>
      </div>

      <BillingPortal hasSubscription={!!profile?.subscriptionId} />
    </div>
  )
}
