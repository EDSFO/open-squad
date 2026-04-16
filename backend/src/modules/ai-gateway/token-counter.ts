import { prisma } from '../../lib/prisma'

// Rough estimate: Use Math.ceil(prompt.length / 4) as specified in task
export function estimateTokens(prompt: string, locale: string = 'pt-BR'): number {
  return Math.ceil(prompt.length / 4)
}

// Count actual tokens from API response metadata
// This would be populated from the actual AI response
export interface TokenCount {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

// Estimate cost based on model (in cents)
// These are rough estimates for Claude 3.5 Sonnet, GPT-4o, Gemini Pro
const MODEL_COSTS: Record<string, { promptPer1M: number; completionPer1M: number }> = {
  'claude-3-5-sonnet': { promptPer1M: 300, completionPer1M: 1500 }, // $3/1M input, $15/1M output
  'gpt-4o': { promptPer1M: 500, completionPer1M: 1500 }, // $5/1M input, $15/1M output
  'gemini-pro': { promptPer1M: 125, completionPer1M: 500 }, // $1.25/1M input, $5/1M output
  'deepseek/deepseek-v3.2': { promptPer1M: 27, completionPer1M: 110 }, // approximate OpenRouter passthrough estimate
}

export function estimateCost(model: string, tokens: TokenCount): number {
  const costs = MODEL_COSTS[model] ?? MODEL_COSTS['claude-3-5-sonnet']
  const promptCost = (tokens.promptTokens / 1_000_000) * costs.promptPer1M
  const completionCost = (tokens.completionTokens / 1_000_000) * costs.completionPer1M
  // Return in cents
  return Math.ceil(promptCost + completionCost)
}

export interface UsageLogData {
  userId: string
  squadExecId?: string | null
  tokensUsed: number
  model: string
  costCents: number
}

export async function logTokenUsage(data: UsageLogData): Promise<void> {
  await prisma.aIUsageLog.create({
    data: {
      userId: data.userId,
      squadExecId: data.squadExecId,
      tokensUsed: data.tokensUsed,
      model: data.model,
      costCents: data.costCents,
    },
  })
}

// Get user's total usage for current month
export async function getMonthlyUsage(userId: string): Promise<number> {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const result = await prisma.aIUsageLog.aggregate({
    where: {
      userId,
      createdAt: {
        gte: startOfMonth,
      },
    },
    _sum: {
      tokensUsed: true,
    },
  })

  return result._sum.tokensUsed ?? 0
}
