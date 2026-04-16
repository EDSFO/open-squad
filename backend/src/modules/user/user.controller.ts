import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import {
  getUserProfile,
  updateUserProfile,
  changePassword,
} from './user.service'

const updateProfileSchema = z.object({
  name: z.string().optional(),
  locale: z.enum(['pt-BR', 'en-US']).optional(),
})

const changePasswordSchema = z.object({
  oldPassword: z.string(),
  newPassword: z.string().min(8),
})

export async function getProfileHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const user = await getUserProfile(request.user.userId)
    if (!user) {
      reply.status(404).send({ error: 'User not found' })
      return
    }
    reply.send({ user })
  } catch (error) {
    reply.status(500).send({ error: 'Internal server error' })
  }
}

export async function updateProfileHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const parsed = updateProfileSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.status(400).send({ error: 'Validation error', details: parsed.error.errors })
      return
    }

    const user = await updateUserProfile(request.user.userId, parsed.data)
    if (!user) {
      reply.status(404).send({ error: 'User not found' })
      return
    }
    reply.send({ user })
  } catch (error) {
    reply.status(500).send({ error: 'Internal server error' })
  }
}

export async function changePasswordHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const parsed = changePasswordSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.status(400).send({ error: 'Validation error', details: parsed.error.errors })
      return
    }

    const { oldPassword, newPassword } = parsed.data
    const result = await changePassword(request.user.userId, oldPassword, newPassword)

    if (!result.success) {
      if (result.error === 'User not found') {
        reply.status(404).send({ error: 'User not found' })
        return
      }
      if (result.error === 'Invalid old password') {
        reply.status(401).send({ error: 'Invalid old password' })
        return
      }
    }

    reply.send({ message: 'Password changed successfully' })
  } catch (error) {
    reply.status(500).send({ error: 'Internal server error' })
  }
}
