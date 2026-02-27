import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Get plugin root directory
 * Priority: CLAUDE_PLUGIN_ROOT env var > script location based detection
 */
export function getPluginRoot(importMetaUrl?: string): string {
  // 1. Check environment variable first
  if (process.env.CLAUDE_PLUGIN_ROOT) {
    return process.env.CLAUDE_PLUGIN_ROOT
  }

  // 2. Derive from script location (scripts/ -> plugin root)
  if (importMetaUrl) {
    const scriptDir = dirname(fileURLToPath(importMetaUrl))
    return dirname(scriptDir) // Go up from scripts/ to plugin root
  }

  // 3. Fallback: try common locations relative to cwd
  const possibleRoots = [
    join(process.cwd(), 'Damascus'),
    process.cwd()
  ]

  for (const root of possibleRoots) {
    if (existsSync(join(root, '.claude-plugin', 'plugin.json'))) {
      return root
    }
  }

  return process.cwd()
}

/**
 * Get settings file path in the project directory
 * Priority: CLAUDE_PROJECT_DIR env var > cwd
 */
export function getSettingsPath(): string {
  const projectDir = process.env.CLAUDE_PROJECT_DIR
  if (projectDir) {
    return join(projectDir, '.claude', 'damascus.local.md')
  }
  return join(process.cwd(), '.claude', 'damascus.local.md')
}

export interface Settings {
  gemini_api_key?: string
  gemini_model?: string
  enable_gemini_review?: boolean
  openai_api_key?: string
  openai_model?: string
  enable_openai_review?: boolean
  enable_claude_review?: boolean
}

/**
 * Parse YAML-like frontmatter from settings file
 */
export function parseSettingsFromContent(content: string): Settings {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!frontmatterMatch) {
    return {}
  }

  const frontmatter = frontmatterMatch[1]
  const settings: Settings = {}

  for (const line of frontmatter.split('\n')) {
    const match = line.match(/^(\w+):\s*(.+)$/)
    if (match) {
      const [, key, value] = match
      const cleanValue = value.replace(/^["']|["']$/g, '').trim()

      switch (key) {
        case 'gemini_api_key':
          settings.gemini_api_key = cleanValue
          break
        case 'gemini_model':
          settings.gemini_model = cleanValue
          break
        case 'enable_gemini_review':
          settings.enable_gemini_review = cleanValue === 'true'
          break
        case 'openai_api_key':
          settings.openai_api_key = cleanValue
          break
        case 'openai_model':
          settings.openai_model = cleanValue
          break
        case 'enable_openai_review':
          settings.enable_openai_review = cleanValue === 'true'
          break
        case 'enable_claude_review':
          settings.enable_claude_review = cleanValue === 'true'
          break
      }
    }
  }

  return settings
}

/**
 * Parse settings from file path
 */
export function parseSettings(settingsFilePath: string): Settings {
  if (!existsSync(settingsFilePath)) {
    return {}
  }

  try {
    const content = readFileSync(settingsFilePath, 'utf-8')
    return parseSettingsFromContent(content)
  } catch {
    return {}
  }
}

/**
 * Build review prompt for plan content
 */
export function buildReviewPrompt(content: string): string {
  return `Review the following implementation plan. A good plan is grounded in the actual codebase — it references real files, functions, and patterns rather than giving generic advice.

Evaluate:
1. Codebase Grounding: Does the plan reference specific code? Or could it apply to any project?
2. Clarity of Thinking: Is the reasoning coherent? Is the approach well-justified?
3. Completeness: Are there obvious gaps — missing error handling, untested paths, ignored edge cases?
4. Feasibility: Is the approach technically sound?
5. Testability: Does the plan address how we'll know it works?

Document content:
---
${content}
---

Provide feedback in concise bullet points. Distinguish critical issues from minor suggestions.`
}

/**
 * Determine if model uses OpenAI Responses API
 */
export function isResponsesAPIModel(model: string): boolean {
  return model.includes('codex') || model.includes('o1') || model.includes('o3')
}

/**
 * Extract text from OpenAI Responses API output
 */
export function extractResponsesAPIText(data: { output?: Array<{ type: string; content?: Array<{ text?: string }> }>; output_text?: string }): string | null {
  const outputs = data.output || []
  const messageOutput = outputs.find((o) => o.type === 'message')
  return messageOutput?.content?.[0]?.text
    ?? outputs[0]?.content?.[0]?.text
    ?? data.output_text
    ?? null
}

/**
 * Convert project path to Claude's folder naming convention
 * /Volumes/FablersBackup/Projects/SugarStar -> -Volumes-FablersBackup-Projects-SugarStar
 */
export function projectPathToClaudeFolder(projectPath: string): string {
  return projectPath.replace(/\//g, '-')
}

/**
 * Get short ID from session ID (first 8 characters)
 */
export function getShortId(sessionId: string): string {
  return sessionId.substring(0, 8)
}
