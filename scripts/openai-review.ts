#!/usr/bin/env npx tsx
import { readFileSync, existsSync } from 'node:fs'
import { stdin, stdout } from 'node:process'
import { parseSettings, buildReviewPrompt, getSettingsPath } from './utils.js'
import { callOpenAIAPI } from './api-clients.js'

interface HookInput {
  file_path?: string
  content?: string
}

interface HookOutput {
  success: boolean
  review?: string
  error?: string
}

const DEFAULT_MODEL = 'gpt-4o-mini'
const SETTINGS_FILE = getSettingsPath()

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
      output({ success: false, error: 'No file_path provided. Usage: openai-review.ts <file_path>' })
      return
    }

    if (!existsSync(filePath)) {
      output({ success: false, error: `File not found: ${filePath}` })
      return
    }

    const settings = parseSettings(SETTINGS_FILE)

    if (settings.enable_openai_review === false) {
      output({ success: false, error: 'OpenAI review is disabled' })
      return
    }

    const apiKey = settings.openai_api_key || process.env.OPENAI_API_KEY
    if (!apiKey) {
      output({
        success: false,
        error: 'No OpenAI API key. Set openai_api_key in .claude/damascus.local.md or OPENAI_API_KEY env var.'
      })
      return
    }

    const model = settings.openai_model || DEFAULT_MODEL
    const modeArg = (process.argv[3] === '--mode' && process.argv[4]) ? process.argv[4] : 'plan'
    const mode: 'plan' | 'doc' = modeArg === 'doc' ? 'doc' : 'plan'
    const fileContent = readFileSync(filePath, 'utf-8')
    const prompt = buildReviewPrompt(fileContent, mode)
    const reviewText = await callOpenAIAPI(prompt, apiKey, model)

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
