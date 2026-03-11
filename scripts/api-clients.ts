import { readFileSync } from 'node:fs'
import { isResponsesAPIModel, extractResponsesAPIText } from './utils.js'

export interface ReviewResult {
  success: boolean
  review?: string
  error?: string
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
  error?: {
    message?: string
  }
}

/**
 * Check if dry-run mode is enabled via DAMASCUS_DRY_RUN env var.
 * In dry-run mode, API calls are skipped and a placeholder response is returned.
 */
export function isDryRun(): boolean {
  return process.env.DAMASCUS_DRY_RUN === 'true'
}

/**
 * Check if a mock response file is configured via DAMASCUS_MOCK_RESPONSE_FILE env var.
 * Returns the file content if set and readable, null otherwise.
 */
export function getMockResponse(): string | null {
  const mockFile = process.env.DAMASCUS_MOCK_RESPONSE_FILE
  if (!mockFile) return null
  try {
    return readFileSync(mockFile, 'utf-8')
  } catch {
    return null
  }
}

export async function callGeminiAPI(prompt: string, apiKey: string, model: string): Promise<string> {
  // Dry-run mode
  if (isDryRun()) {
    return `[DRY RUN] Gemini (${model}) review skipped. Prompt: ${prompt.length} chars.`
  }

  // Mock response mode
  const mock = getMockResponse()
  if (mock !== null) return mock

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const payload = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60000)
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json() as GeminiResponse

  if (data.error) {
    throw new Error(data.error.message ?? 'Unknown Gemini API error')
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Unable to retrieve review result.'
}

export async function callOpenAIAPI(prompt: string, apiKey: string, model: string): Promise<string> {
  // Dry-run mode
  if (isDryRun()) {
    return `[DRY RUN] OpenAI (${model}) review skipped. Prompt: ${prompt.length} chars.`
  }

  // Mock response mode
  const mock = getMockResponse()
  if (mock !== null) return mock

  const isResponsesAPI = isResponsesAPIModel(model)
  const url = isResponsesAPI
    ? 'https://api.openai.com/v1/responses'
    : 'https://api.openai.com/v1/chat/completions'

  const systemPrompt = 'You are a technical document reviewer. Provide constructive, actionable feedback.'

  const payload = isResponsesAPI
    ? {
        model,
        input: `${systemPrompt}\n\n${prompt}`
      }
    : {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4096
      }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60000)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()

  if (data.error) {
    throw new Error(data.error.message ?? 'Unknown OpenAI API error')
  }

  if (isResponsesAPI) {
    const text = extractResponsesAPIText(data)
    if (!text) {
      const outputs = data.output || []
      throw new Error(`No text in response. Output types: ${outputs.map((o: { type: string }) => o.type).join(', ')}`)
    }
    return text
  }

  return data.choices?.[0]?.message?.content ?? 'Unable to retrieve review result.'
}
