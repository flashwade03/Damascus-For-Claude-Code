#!/usr/bin/env npx tsx
import { readFileSync, existsSync } from 'node:fs'
import { stdin, stdout } from 'node:process'
import { join } from 'node:path'
import { parseSettings, buildReviewPrompt, getPluginRoot } from './utils.js'

interface HookInput {
  file_path?: string
  content?: string
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

interface HookOutput {
  success: boolean
  review?: string
  error?: string
}

const DEFAULT_MODEL = 'gemini-3-flash-preview'
const PLUGIN_ROOT = getPluginRoot(import.meta.url)
const SETTINGS_FILE = join(PLUGIN_ROOT, 'settings.local.md')

async function callGeminiAPI(prompt: string, apiKey: string, model: string): Promise<string> {
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
    signal: AbortSignal.timeout(30000)
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

function output(result: HookOutput): void {
  stdout.write(JSON.stringify(result))
}

async function main(): Promise<void> {
  try {
    let filePath: string | undefined

    if (process.argv[2]) {
      filePath = process.argv[2]
    } else {
      const inputRaw = readFileSync(stdin.fd, 'utf-8')
      const input: HookInput = JSON.parse(inputRaw)
      filePath = input.file_path
    }

    if (!filePath) {
      output({ success: false, error: 'No file_path provided. Usage: gemini-review.ts <file_path>' })
      return
    }

    if (!existsSync(filePath)) {
      output({ success: false, error: `File not found: ${filePath}` })
      return
    }

    const settings = parseSettings(SETTINGS_FILE)

    if (settings.enable_gemini_review === false) {
      output({ success: false, error: 'Gemini review is disabled' })
      return
    }

    const apiKey = settings.gemini_api_key || process.env.GEMINI_API_KEY
    if (!apiKey) {
      output({
        success: false,
        error: 'No Gemini API key. Set gemini_api_key in plugin settings.local.md or GEMINI_API_KEY env var.'
      })
      return
    }

    const model = settings.gemini_model || DEFAULT_MODEL
    const fileContent = readFileSync(filePath, 'utf-8')
    const prompt = buildReviewPrompt(fileContent)
    const reviewText = await callGeminiAPI(prompt, apiKey, model)

    output({
      success: true,
      review: reviewText
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    output({
      success: false,
      error: message
    })
  }
}

main()
