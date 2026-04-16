import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import {
  registerUser,
  loginUser,
  getUserById,
  RegisterInput,
  LoginInput,
} from './auth.service'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export async function registerHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const parsed = registerSchema.parse(request.body) as RegisterInput
    const result = await registerUser(request.server, parsed)
    reply.status(201).send(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      reply.status(400).send({ error: 'Validation error', details: error.errors })
      return
    }
    if (error instanceof Error && error.message === 'User already exists') {
      reply.status(409).send({ error: 'User already exists' })
      return
    }
    reply.status(500).send({ error: 'Internal server error' })
  }
}

export async function loginHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const parsed = loginSchema.parse(request.body) as LoginInput
    const result = await loginUser(request.server, parsed)
    reply.send(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      reply.status(400).send({ error: 'Validation error', details: error.errors })
      return
    }
    if (error instanceof Error && error.message === 'Invalid credentials') {
      reply.status(401).send({ error: 'Invalid credentials' })
      return
    }
    reply.status(500).send({ error: 'Internal server error' })
  }
}

export async function logoutHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // JWT is stateless - client should discard the token
  // Server-side session invalidation would require a token blacklist (Redis)
  reply.send({ message: 'Logged out successfully' })
}

export async function meHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const user = await getUserById(request.user.userId)
    if (!user) {
      reply.status(404).send({ error: 'User not found' })
      return
    }
    reply.send({ user })
  } catch (error) {
    reply.status(500).send({ error: 'Internal server error' })
  }
}
