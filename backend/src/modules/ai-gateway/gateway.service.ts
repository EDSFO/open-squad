import { callWithFallback, AIResponse } from './fallback-chain'
import { checkRateLimit } from './rate-limiter'
import {
  estimateTokens,
  estimateCost,
  logTokenUsage,
  TokenCount,
} from './token-counter'
import { prisma } from '../../lib/prisma'

export interface CallAIResult {
  content: string
  model: string
  provider: string
  tokensUsed: number
  costCents: number
  rateLimit: {
    allowed: boolean
    remaining: number
    resetAt: Date
  }
}

export interface CallAIOptions {
  userId: string
  prompt: string
  model: string
  squadExecId?: string
  locale?: string
}

export async function callAI(options: CallAIOptions): Promise<CallAIResult> {
  const { userId, prompt, model, squadExecId, locale = 'pt-BR' } = options

  // Step 1: Estimate tokens before call
  const estimatedTokens = estimateTokens(prompt, locale)

  // Step 2: Check rate limit
  const rateLimitResult = await checkRateLimit(userId, 'minute', estimatedTokens)

  if (!rateLimitResult.allowed) {
    throw new AIGatewayError(
      'Rate limit exceeded',
      'RATE_LIMIT_EXCEEDED',
      429,
      {
        remaining: 0,
        resetAt: rateLimitResult.resetAt,
      }
    )
  }

  // Step 3: Call AI with fallback chain
  let aiResponse: AIResponse
  try {
    aiResponse = await callWithFallback(prompt, model)
  } catch (error) {
    throw new AIGatewayError(
      `AI call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'AI_PROVIDER_ERROR',
      502
    )
  }

  // Step 4: Calculate actual tokens and cost
  const usage: TokenCount = aiResponse.usage ?? {
    promptTokens: estimatedTokens,
    completionTokens: Math.ceil(aiResponse.content.length / 4),
    totalTokens: estimatedTokens + Math.ceil(aiResponse.content.length / 4),
  }

  const totalTokens = usage.totalTokens
  const costCents = estimateCost(model, usage)

  // Step 5: Log usage to database
  await logTokenUsage({
    userId,
    squadExecId,
    tokensUsed: totalTokens,
    model: aiResponse.model,
    costCents,
  })

  return {
    content: aiResponse.content,
    model: aiResponse.model,
    provider: aiResponse.provider,
    tokensUsed: totalTokens,
    costCents,
    rateLimit: {
      allowed: true,
      remaining: rateLimitResult.remaining,
      resetAt: rateLimitResult.resetAt,
    },
  }
}

export class AIGatewayError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public rateLimitInfo?: { remaining: number; resetAt: Date }
  ) {
    super(message)
    this.name = 'AIGatewayError'
  }
}

// Get user's AI usage statistics
export async function getAIUsageStats(userId: string) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [monthlyUsage, yearlyUsage, recentLogs] = await Promise.all([
    prisma.aIUsageLog.aggregate({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
      },
      _sum: { tokensUsed: true, costCents: true },
      _count: true,
    }),
    prisma.aIUsageLog.aggregate({
      where: { userId },
      _sum: { tokensUsed: true, costCents: true },
      _count: true,
    }),
    prisma.aIUsageLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        tokensUsed: true,
        model: true,
        costCents: true,
        createdAt: true,
      },
    }),
  ])

  return {
    monthly: {
      tokensUsed: monthlyUsage._sum.tokensUsed ?? 0,
      costCents: monthlyUsage._sum.costCents ?? 0,
      requests: monthlyUsage._count,
    },
    yearly: {
      tokensUsed: yearlyUsage._sum.tokensUsed ?? 0,
      costCents: yearlyUsage._sum.costCents ?? 0,
      requests: yearlyUsage._count,
    },
    recentLogs,
  }
}
