import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma'
import { FastifyInstance } from 'fastify'
import { JwtPayload } from './index'
import { sendWelcomeEmailNonBlocking } from '../notifications/email.service'

const BCRYPT_ROUNDS = 12
const JWT_EXPIRATION = '7d'

export interface RegisterInput {
  email: string
  password: string
  name?: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface AuthResult {
  token: string
  user: {
    id: string
    email: string
    name: string | null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export async function generateJwt(
  fastify: FastifyInstance,
  payload: JwtPayload
): Promise<string> {
  return fastify.jwt.sign(payload, { expiresIn: JWT_EXPIRATION })
}

export async function registerUser(
  fastify: FastifyInstance,
  input: RegisterInput
): Promise<AuthResult> {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  })

  if (existingUser) {
    throw new Error('User already exists')
  }

  const passwordHash = await hashPassword(input.password)

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
    },
  })

  const token = await generateJwt(fastify, {
    userId: user.id,
    email: user.email,
  })

  // Send welcome email (non-blocking - don't await)
  sendWelcomeEmailNonBlocking({
    id: user.id,
    email: user.email,
    name: user.name,
    locale: user.locale,
  })

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  }
}

export async function loginUser(
  fastify: FastifyInstance,
  input: LoginInput
): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  })

  if (!user) {
    throw new Error('Invalid credentials')
  }

  const isValid = await comparePassword(input.password, user.passwordHash)

  if (!isValid) {
    throw new Error('Invalid credentials')
  }

  const token = await generateJwt(fastify, {
    userId: user.id,
    email: user.email,
  })

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  }
}

export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      locale: true,
      plan: true,
      squadLimit: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}
