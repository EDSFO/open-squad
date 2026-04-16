export interface AIResponse {
  content: string
  model: string
  provider: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface AICallOptions {
  prompt: string
  model: string
  maxTokens?: number
  temperature?: number
}

async function callAnthropic(options: AICallOptions): Promise<AIResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: options.model,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.7,
      messages: [
        {
          role: 'user',
          content: options.prompt,
        },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic API error: ${response.status} - ${error}`)
  }

  const data = await response.json() as {
    content: Array<{ type: string; text: string }>
    usage: { input_tokens: number; output_tokens: number }
  }

  return {
    content: data.content[0]?.text ?? '',
    model: options.model,
    provider: 'anthropic',
    usage: {
      promptTokens: data.usage.input_tokens,
      completionTokens: data.usage.output_tokens,
      totalTokens: data.usage.input_tokens + data.usage.output_tokens,
    },
  }
}

async function callOpenAI(options: AICallOptions): Promise<AIResponse> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.7,
      messages: [
        {
          role: 'user',
          content: options.prompt,
        },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${error}`)
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  }

  return {
    content: data.choices[0]?.message?.content ?? '',
    model: options.model,
    provider: 'openai',
    usage: {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    },
  }
}

async function callOpenRouter(options: AICallOptions): Promise<AIResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured')
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'Opensquad',
    },
    body: JSON.stringify({
      model: options.model,
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.7,
      messages: [
        {
          role: 'user',
          content: options.prompt,
        },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`)
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
    model?: string
  }

  return {
    content: data.choices[0]?.message?.content ?? '',
    model: data.model || options.model,
    provider: 'openrouter',
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens ?? 0,
          completionTokens: data.usage.completion_tokens ?? 0,
          totalTokens: data.usage.total_tokens ?? 0,
        }
      : undefined,
  }
}

async function callGoogle(options: AICallOptions): Promise<AIResponse> {
  const apiKey = process.env.GOOGLE_AI_API_KEY

  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY not configured')
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: options.prompt,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: options.maxTokens ?? 1024,
          temperature: options.temperature ?? 0.7,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Google API error: ${response.status} - ${error}`)
  }

  const data = await response.json() as {
    candidates: Array<{
      content: {
        parts: Array<{ text: string }>
      }
    }>
    usageMetadata?: {
      promptTokenCount?: number
      candidateTokenCount?: number
      totalTokenCount?: number
    }
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const usage = data.usageMetadata

  return {
    content: text,
    model: options.model,
    provider: 'google',
    usage: usage
      ? {
          promptTokens: usage.promptTokenCount ?? 0,
          completionTokens: usage.candidateTokenCount ?? 0,
          totalTokens: usage.totalTokenCount ?? 0,
        }
      : undefined,
  }
}

function getProviderForModel(model: string): 'openrouter' | 'anthropic' | 'openai' | 'google' {
  if (model.includes('/')) return 'openrouter'
  if (model.startsWith('claude')) return 'anthropic'
  if (model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3')) return 'openai'
  return 'google'
}

const FALLBACK_ORDER = ['openrouter', 'anthropic', 'openai', 'google'] as const

export async function callWithFallback(prompt: string, model: string): Promise<AIResponse> {
  const primaryProvider = getProviderForModel(model)
  const providers = [primaryProvider, ...FALLBACK_ORDER.filter((p) => p !== primaryProvider)]

  let lastError: Error | null = null

  for (const provider of providers) {
    try {
      switch (provider) {
        case 'openrouter':
          return await callOpenRouter({ prompt, model })
        case 'anthropic':
          return await callAnthropic({ prompt, model })
        case 'openai':
          return await callOpenAI({ prompt, model })
        case 'google':
          return await callGoogle({ prompt, model })
      }
    } catch (error) {
      lastError = error as Error
      console.error(`Provider ${provider} failed, trying next fallback:`, error)
    }
  }

  throw new Error(`All AI providers failed. Last error: ${lastError?.message}`)
}
