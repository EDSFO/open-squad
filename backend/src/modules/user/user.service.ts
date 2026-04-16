import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma'

const BCRYPT_ROUNDS = 12

export interface UpdateProfileInput {
  name?: string
  locale?: string
}

export interface ChangePasswordInput {
  oldPassword: string
  newPassword: string
}

export interface UserProfile {
  id: string
  email: string
  name: string | null
  locale: string
  plan: string
  squadLimit: number
  isActive: boolean
  stripeCustomerId: string | null
  subscriptionId: string | null
  createdAt: Date
  updatedAt: Date
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      locale: true,
      plan: true,
      squadLimit: true,
      isActive: true,
      stripeCustomerId: true,
      subscriptionId: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return user
}

export async function updateUserProfile(
  userId: string,
  data: UpdateProfileInput
): Promise<UserProfile | null> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      locale: data.locale,
    },
    select: {
      id: true,
      email: true,
      name: true,
      locale: true,
      plan: true,
      squadLimit: true,
      isActive: true,
      stripeCustomerId: true,
      subscriptionId: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return user
}

export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      passwordHash: true,
    },
  })

  // Always run bcrypt.compare to prevent timing-based user enumeration
  const dummyHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4jITqZCDj8Z.lPzu'
  const hashToCompare = user?.passwordHash ?? dummyHash
  await bcrypt.compare(oldPassword, hashToCompare)

  if (!user) {
    return { success: false, error: 'User not found' }
  }

  const isValid = await bcrypt.compare(oldPassword, user.passwordHash)

  if (!isValid) {
    return { success: false, error: 'Invalid old password' }
  }

  const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newPasswordHash,
    },
  })

  return { success: true }
}
